import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HiringPostDetailView } from '@/features/hiring/components/detail/hiring-post-detail-view'
import { normalizeHiringPost } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { resolveServerEntity } from '@/shared/api/server-load'
import { defaultShareImage, JsonLd, seoDescription } from '@/shared/lib/seo'
import { jobPostingJsonLd } from '@/shared/lib/seo-jsonld'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'
import type { ApiResponse, HiringPost } from '@/shared/schemas'

// Read first without cookies, so the page is the same for everyone and can be cached; the client view then loads the
// signed-in candidate's "applied" state.
const getHiringPost = cache(async (id: number) => {
  const extractPost = (data: ApiResponse<HiringPost>) => (data.content ? normalizeHiringPost(data.content) : null)
  const response = await serverRequest<ApiResponse<HiringPost>>(`/api/hiring-posts/${id}`, {
    includeCookies: false,
    next: { revalidate: 120 },
  })
  const publicOutcome = resolveServerEntity(response, extractPost)
  // Return immediately on success or on a network error (status 0) / 5xx outage so outages never become 404s.
  // Any 4xx (closed posts return 403 to anonymous callers, and 401/404/etc. may still resolve with cookies)
  // falls through to the uncached cookie-authenticated retry.
  if (publicOutcome.kind === 'ok') return publicOutcome
  if (!response.ok && (response.status === 0 || response.status >= 500)) return publicOutcome

  // A closed post is only shown to its owner and to admins, so the open read above is refused. Try once with the
  // viewer's own cookies (never cached, because it can show a private page); anyone else still gets "not found".
  const own = await serverRequest<ApiResponse<HiringPost>>(`/api/hiring-posts/${id}`)
  return resolveServerEntity(own, extractPost, { treatUnauthorizedAsNotFound: true })
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = positiveIntegerRouteParam((await params).id)
  if (!id) return { title: 'Hiring post not found', robots: { index: false, follow: false } }

  const result = await getHiringPost(id)
  if (result.kind !== 'ok') {
    return {
      title: result.kind === 'not-found' ? 'Hiring post not found' : 'Hiring post unavailable',
      robots: { index: false, follow: false },
    }
  }

  const post = result.data
  // A closed post (seen only by its owner or an admin) stays out of search results.
  const hidden = post.status !== 'OPEN'

  const employer = post.companyName || post.recruiter?.name
  const title = employer ? `${post.title} at ${employer}` : post.title
  const description = seoDescription(post.description, `Apply for ${post.title} on JobAura.`)
  const canonical = `/hiring-posts/${post.id}`
  return {
    title,
    description,
    robots: hidden ? { index: false, follow: false } : undefined,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'JobAura', type: 'website', images: [defaultShareImage] },
    twitter: { card: 'summary_large_image', title, description, images: [defaultShareImage.url] },
  }
}

// Page /hiring-posts/[id] — renders <HiringPostDetailView> (features/hiring/components/detail/hiring-post-detail-view.tsx).
// Data loaded on the server here first (for SEO and a fast first paint); the component refreshes it in the browser.
export default async function HiringPostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveIntegerRouteParam((await params).id)
  if (!id) notFound()
  const result = await getHiringPost(id)
  if (result.kind === 'not-found') notFound()
  if (result.kind === 'error') {
    // Let (marketplace)/error.tsx show recovery UI instead of misreporting a 5xx outage as a 404.
    throw new Error(`Could not load hiring post #${id}: ${result.message}`)
  }

  const post = result.data
  // A closed post gets no JobPosting data: it is private and kept out of search.
  const structuredData = jobPostingJsonLd(post)
  return (
    <>
      {structuredData ? <JsonLd data={structuredData} /> : null}
      <HiringPostDetailView initialPost={post} />
    </>
  )
}
