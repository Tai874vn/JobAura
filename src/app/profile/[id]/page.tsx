import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProfilePage } from '@/features/users/profile-page'
import { getUserPosts } from '@/features/users/profile-posts'
import { normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { absoluteAssetUrl, absoluteSiteUrl, JsonLd, seoDescription } from '@/shared/lib/seo'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'
import type { ApiResponse, Job, PaginatedContent, UserProfile } from '@/shared/schemas'
import { Card, CardContent } from '@/shared/ui'

const getProfileData = cache(async (id: string) => {
  const [response, jobsResponse] = await Promise.all([
    serverRequest<ApiResponse<UserProfile>>(`/api/users/profile/${id}`, { includeCookies: false }),
    serverRequest<ApiResponse<PaginatedContent<Job>>>(`/api/jobs/by-creator/${id}?page=1&pageSize=20`, {
      includeCookies: false,
      next: { revalidate: 300 },
    }),
  ])

  return { response, jobsResponse }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const profileId = positiveIntegerRouteParam(id)
  if (!profileId) return { title: 'Profile not found', robots: { index: false, follow: false } }
  const { response } = await getProfileData(String(profileId))
  const user = response.ok ? response.data.content : null

  if (!user) {
    return {
      title: 'Profile not found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const title = `${user.name} - JobAura profile`
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
      type: 'website',
      images: image ? [{ url: image, alt: user.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

function profileSkills(user: UserProfile) {
  return (user.profileSkills ?? user.skills ?? legacySkills(user.skill)).map((skill) => skill.name).filter(Boolean)
}

function legacySkills(value?: string | null) {
  if (!value) return []
  return value
    .split(',')
    .map((name, sortOrder) => ({ name: name.trim(), sortOrder }))
    .filter((skill) => skill.name)
}

function personJsonLd(user: UserProfile, posts: Job[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': absoluteSiteUrl(`/profile/${user.id}#person`),
    name: user.name,
    url: absoluteSiteUrl(`/profile/${user.id}`),
    image: absoluteAssetUrl(user.avatar),
    jobTitle: user.headline,
    description: seoDescription(user.bio || user.headline, `${user.name}'s public JobAura profile.`, 500),
    email: user.email,
    address: user.location
      ? {
          '@type': 'PostalAddress',
          addressLocality: user.location,
        }
      : undefined,
    knowsAbout: profileSkills(user),
    makesOffer: posts.slice(0, 10).map((job) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: job.tenCongViec,
        url: absoluteSiteUrl(`/jobs/${job.id}`),
      },
      priceCurrency: 'USD',
      price: job.giaTien,
    })),
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profileId = positiveIntegerRouteParam(id)
  if (!profileId) notFound()
  const { response, jobsResponse } = await getProfileData(String(profileId))

  if (!response.ok) return <ProfileLoadError id={profileId} />
  if (!response.data.content) notFound()

  const jobs = jobsResponse.ok ? normalizePaginatedJobsResponse(jobsResponse.data).content?.data ?? [] : []
  const posts = getUserPosts(jobs, response.data.content.id)

  return (
    <>
      <JsonLd data={personJsonLd(response.data.content, posts)} />
      <ProfilePage user={response.data.content} posts={posts} />
    </>
  )
}

function ProfileLoadError({ id }: { id: number }) {
  return (
    <div className="container-page py-10">
      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-danger">Profile unavailable</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Could not load profile #{id}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            The profile page is available, but the backend profile endpoint returned an error instead of profile data.
          </p>
          <p className="mt-4 rounded-lg bg-surface-muted p-4 text-sm text-muted">
            Please try again later. If the problem continues, contact JobAura support with profile ID #{id}.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
