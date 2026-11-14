import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JobDetailView } from '@/features/jobs/job-detail-view'
import { getSellerHref, getSellerName } from '@/features/jobs/seller-profile'
import { normalizeJobResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { absoluteAssetUrl, absoluteSiteUrl, JsonLd, seoDescription } from '@/shared/lib/seo'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'
import type { ApiResponse, Comment, Job } from '@/shared/schemas'

const getJob = cache(async (id: string) => {
  const response = await serverRequest<ApiResponse<Job & { binhLuans?: Comment[] }>>(`/api/jobs/details/${id}`, {
    includeCookies: false,
    next: { revalidate: 300 },
  })

  return response.ok ? normalizeJobResponse(response.data).content : null
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const jobId = positiveIntegerRouteParam(id)
  const job = jobId ? await getJob(String(jobId)) : null
  if (!job) {
    return {
      title: 'Service not found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

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
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

function serviceJsonLd(job: Job & { binhLuans?: Comment[] }) {
  const sellerName = getSellerName(job)
  const sellerHref = getSellerHref(job)
  const reviewCount = Math.max(job.reviews ?? 0, job.binhLuans?.length ?? 0)
  const ratingValue = job.rating ?? 0

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': absoluteSiteUrl(`/jobs/${job.id}#service`),
    name: job.title,
    description: seoDescription(job.description || job.shortDescription, `Hire ${job.title} on JobAura.`, 500),
    image: absoluteAssetUrl(job.image),
    category: job.subcategory?.name,
    provider: {
      '@type': 'Person',
      name: sellerName,
      url: sellerHref ? absoluteSiteUrl(sellerHref) : undefined,
    },
    offers: {
      '@type': 'Offer',
      url: absoluteSiteUrl(`/jobs/${job.id}`),
      priceCurrency: 'USD',
      price: job.price,
      availability: 'https://schema.org/InStock',
    },
    aggregateRating:
      ratingValue > 0 && reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue,
            reviewCount,
          }
        : undefined,
  }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const jobId = positiveIntegerRouteParam(id)
  if (!jobId) notFound()
  const job = await getJob(String(jobId))
  if (!job) notFound()
  return (
    <>
      <JsonLd data={serviceJsonLd(job)} />
      <JobDetailView job={job} comments={job.binhLuans ?? []} />
    </>
  )
}
