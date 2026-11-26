import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JobDetailView } from '@/features/jobs/components/detail/job-detail-view'
import { getSellerHref, getSellerName } from '@/features/jobs/utils/seller-profile'
import { normalizeJobResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { resolveServerEntity } from '@/shared/api/server-load'
import { absoluteAssetUrl, defaultShareImage, JsonLd, seoDescription } from '@/shared/lib/seo'
import { serviceJsonLd } from '@/shared/lib/seo-jsonld'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'
import type { ApiResponse, Comment, Job } from '@/shared/schemas'

const getJob = cache(async (id: string) => {
  const response = await serverRequest<ApiResponse<Job & { binhLuans?: Comment[] }>>(`/api/jobs/details/${id}`, {
    includeCookies: false,
    next: { revalidate: 300 },
  })

  return resolveServerEntity(response, (data) => normalizeJobResponse(data).content)
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const jobId = positiveIntegerRouteParam(id)
  if (!jobId) {
    return {
      title: 'Service not found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const result = await getJob(String(jobId))
  if (result.kind !== 'ok') {
    return {
      title: result.kind === 'not-found' ? 'Service not found' : 'Service unavailable',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const job = result.data
  const title = job.title
  const description = seoDescription(job.shortDescription || job.description, `Hire ${title} on JobAura.`)
  const image = absoluteAssetUrl(job.image)
  const canonical = `/jobs/${job.id}`

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
      // With no picture of its own, the card uses the shared JobAura picture.
      images: image ? [{ url: image, alt: title }] : [defaultShareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image ?? defaultShareImage.url],
    },
  }
}

// Page /jobs/[id] — renders <JobDetailView> (features/jobs/components/detail/job-detail-view.tsx).
// Data loaded on the server here first (for SEO and a fast first paint); the component refreshes it in the browser.
export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const jobId = positiveIntegerRouteParam(id)
  if (!jobId) notFound()
  const result = await getJob(String(jobId))
  if (result.kind === 'not-found') notFound()
  if (result.kind === 'error') {
    // Let jobs/[id]/error.tsx show recovery UI instead of misreporting a 5xx outage as a 404.
    throw new Error(`Could not load service #${jobId}: ${result.message}`)
  }

  const job = result.data
  return (
    <>
      <JsonLd data={serviceJsonLd(job, { name: getSellerName(job), href: getSellerHref(job) })} />
      <JobDetailView job={job} comments={job.binhLuans ?? []} />
    </>
  )
}
