import { Suspense } from 'react'
import { cache } from 'react'
import type { Metadata } from 'next'
import { JobListView } from '@/features/jobs/job-list-view'
import { normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { absoluteSiteUrl, JsonLd, organizationJsonLd, websiteJsonLd } from '@/shared/lib/seo'
import type { ApiResponse, Job, PaginatedContent } from '@/shared/schemas'
import { JobsPageSkeleton } from '@/features/jobs/job-results-skeleton'

export const metadata: Metadata = {
  title: 'Explore services',
  description: 'Search and compare freelance services, skills, pricing, ratings, and specialists on JobAura.',
  alternates: {
    canonical: '/jobs',
  },
}

const getInitialJobs = cache(async () => {
  const response = await serverRequest<ApiResponse<PaginatedContent<Job>>>(
    '/api/jobs/paginated-search?page=1&pageSize=12',
    { includeCookies: false, next: { revalidate: 300 } }
  )

  return response.ok ? normalizePaginatedJobsResponse(response.data).content?.data ?? [] : []
})

function jobsItemListJsonLd(jobs: Job[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': absoluteSiteUrl('/jobs#services'),
    name: 'Explore JobAura services',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: jobs.length,
    itemListElement: jobs.map((job, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteSiteUrl(`/jobs/${job.id}`),
      name: job.title,
    })),
  }
}

export default async function JobsPage() {
  const jobs = await getInitialJobs()

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), jobsItemListJsonLd(jobs)]} />
      <Suspense fallback={<JobsPageSkeleton />}>
        <JobListView />
      </Suspense>
    </>
  )
}
