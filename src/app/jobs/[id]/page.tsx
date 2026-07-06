import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JobDetailView } from '@/features/jobs/job-detail-view'
import { getSellerHref, getSellerName } from '@/features/jobs/seller-profile'
import { normalizeJobResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { absoluteAssetUrl, absoluteSiteUrl, JsonLd, seoDescription } from '@/shared/lib/seo'
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
  const job = await getJob(id)
  if (!job) {
    return {
      title: 'Service not found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const title = job.tenCongViec
  const description = seoDescription(job.moTaNgan || job.moTa, `Hire ${title} on JobAura.`)
  const image = absoluteAssetUrl(job.hinhAnh)
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
  const reviewCount = Math.max(job.danhGia ?? 0, job.binhLuans?.length ?? 0)
  const ratingValue = job.saoCongViec ?? 0

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': absoluteSiteUrl(`/jobs/${job.id}#service`),
    name: job.tenCongViec,
    description: seoDescription(job.moTa || job.moTaNgan, `Hire ${job.tenCongViec} on JobAura.`, 500),
    image: absoluteAssetUrl(job.hinhAnh),
    category: job.chiTietLoaiCongViec?.tenChiTiet,
    provider: {
      '@type': 'Person',
      name: sellerName,
      url: sellerHref ? absoluteSiteUrl(sellerHref) : undefined,
    },
    offers: {
      '@type': 'Offer',
      url: absoluteSiteUrl(`/jobs/${job.id}`),
      priceCurrency: 'USD',
      price: job.giaTien,
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
  const job = await getJob(id)
  if (!job) notFound()
  return (
    <>
      <JsonLd data={serviceJsonLd(job)} />
      <JobDetailView job={job} comments={job.binhLuans ?? []} />
    </>
  )
}
