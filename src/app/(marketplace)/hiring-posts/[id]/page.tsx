import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HiringPostDetailView } from '@/features/hiring/hiring-post-detail-view'
import { normalizeHiringPost } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { absoluteSiteUrl, JsonLd, seoDescription } from '@/shared/lib/seo'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'
import type { ApiResponse, HiringPost } from '@/shared/schemas'

// Read without cookies, so the page is the same for everyone and can be cached; the client view then loads the
// signed-in candidate's "applied" state.
const getHiringPost = cache(async (id: number) => {
  const response = await serverRequest<ApiResponse<HiringPost>>(`/api/hiring-posts/${id}`, {
    includeCookies: false,
    next: { revalidate: 120 },
  })
  return response.ok && response.data.content ? normalizeHiringPost(response.data.content) : null
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = positiveIntegerRouteParam((await params).id)
  const post = id ? await getHiringPost(id) : null
  if (!post) return { title: 'Hiring post not found', robots: { index: false, follow: false } }

  const employer = post.companyName || post.recruiter?.name
  const title = employer ? `${post.title} at ${employer}` : post.title
  const description = seoDescription(post.description, `Apply for ${post.title} on JobAura.`)
  const canonical = `/hiring-posts/${post.id}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'JobAura', type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

function jobPostingJsonLd(post: HiringPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: post.title,
    description: post.description,
    datePosted: post.createdAt,
    validThrough: post.closesAt ?? undefined,
    employmentType: post.employmentType ?? undefined,
    hiringOrganization: { '@type': 'Organization', name: post.companyName || post.recruiter?.name || 'JobAura recruiter' },
    jobLocation: post.location ? { '@type': 'Place', address: post.location } : undefined,
    skills: post.skills.length ? post.skills.join(', ') : undefined,
    url: absoluteSiteUrl(`/hiring-posts/${post.id}`),
  }
}

export default async function HiringPostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveIntegerRouteParam((await params).id)
  if (!id) notFound()
  const post = await getHiringPost(id)
  if (!post) notFound()
  return (
    <>
      <JsonLd data={jobPostingJsonLd(post)} />
      <HiringPostDetailView initialPost={post} />
    </>
  )
}
