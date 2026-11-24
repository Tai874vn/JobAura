import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProfilePage } from '@/features/users/profile-page'
import { getUserPosts } from '@/features/users/profile-posts'
import { normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { resolveServerEntity } from '@/shared/api/server-load'
import { absoluteAssetUrl, defaultShareImage, JsonLd, seoDescription } from '@/shared/lib/seo'
import { personJsonLd } from '@/shared/lib/seo-jsonld'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'
import type { ApiResponse, Job, PaginatedContent, UserProfile } from '@/shared/schemas'

const getProfileData = cache(async (id: string) => {
  const [response, jobsResponse] = await Promise.all([
    // Public, cookie-less read kept for 2 minutes (ISR: the page is rebuilt in the background at most every 2
    // minutes). Saving the profile clears it at once through refreshMyProfilePage.
    serverRequest<ApiResponse<UserProfile>>(`/api/users/profile/${id}`, {
      includeCookies: false,
      next: { revalidate: 120 },
    }),
    serverRequest<ApiResponse<PaginatedContent<Job>>>(`/api/jobs/by-creator/${id}?page=1&pageSize=20`, {
      includeCookies: false,
      next: { revalidate: 300 },
    }),
  ])

  const profile = resolveServerEntity(response, (data) => data.content)
  return { profile, jobsResponse }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const profileId = positiveIntegerRouteParam(id)
  if (!profileId) return { title: 'Profile not found', robots: { index: false, follow: false } }
  const { profile } = await getProfileData(String(profileId))

  if (profile.kind !== 'ok') {
    return {
      title: profile.kind === 'not-found' ? 'Profile not found' : 'Profile unavailable',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const user = profile.data
  // The layout adds " | JobAura" to the tab title, so the page title is just the person (and their headline).
  const headline = user.headline?.trim()
  const title = headline ? `${user.name} - ${headline}` : user.name
  const description = seoDescription(user.headline || user.bio, `View ${user.name}'s public JobAura profile, skills, services, and marketplace activity.`)
  const image = absoluteAssetUrl(user.avatar ?? user.coverImage ?? user.cover)
  const canonical = `/profile/${user.id}`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'JobAura',
      type: 'profile',
      // With no picture of its own, the card uses the shared JobAura picture.
      images: image ? [{ url: image, alt: user.name }] : [defaultShareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image ?? defaultShareImage.url],
    },
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profileId = positiveIntegerRouteParam(id)
  if (!profileId) notFound()
  const { profile, jobsResponse } = await getProfileData(String(profileId))

  if (profile.kind === 'not-found') notFound()
  if (profile.kind === 'error') {
    // Throw so profile/[id]/error.tsx handles recovery instead of serving a soft-404 HTTP 200 page.
    throw new Error(`Could not load profile #${profileId}: ${profile.message}`)
  }

  const jobs = jobsResponse.ok ? normalizePaginatedJobsResponse(jobsResponse.data).content?.data ?? [] : []
  const posts = getUserPosts(jobs, profile.data.id)

  return (
    <>
      <JsonLd data={personJsonLd(profile.data, posts)} />
      <ProfilePage user={profile.data} posts={posts} />
    </>
  )
}
