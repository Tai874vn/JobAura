import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { JobListView } from '@/features/jobs/job-list-view'
import { JobsPageSkeleton } from '@/features/jobs/job-results-skeleton'
import { canPrefetchJobs, readJobListFilters, toJobSearchParams } from '@/features/jobs/jobs-browse-view'
import { normalizeCategoriesResponse, normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { queryKeys } from '@/shared/api/query-keys'
import { serverRequest } from '@/shared/api/server'
import { toQueryString, toUrlSearchParams, type RawSearchParams } from '@/shared/lib/search-params'
import { buildPageMetadata, JsonLd, organizationJsonLd, websiteJsonLd } from '@/shared/lib/seo'
import { jobsItemListJsonLd } from '@/shared/lib/seo-jsonld'
import type { ApiResponse, Category, Job, PaginatedContent } from '@/shared/schemas'

export const metadata: Metadata = buildPageMetadata({
  title: 'Candidate portfolios',
  description: 'Browse candidate portfolio posts and priced services by field and skill on JobAura.',
  canonical: '/jobs',
})

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<RawSearchParams>
}) {
  const urlSearchParams = toUrlSearchParams(await searchParams)
  const { page, ...applied } = readJobListFilters(urlSearchParams)
  const apiParams = toJobSearchParams(applied, page)
  const queryString = toQueryString(apiParams)

  // Fetch only public, cookie-less data on the server so the first paint shows real cards, kept 5 minutes in the
  // Next.js Data Cache (shared by every visitor). The list itself is fetched here only for the plain first pages; a
  // search or filter is left to the browser, as before (see canPrefetchJobs).
  const prefetchJobs = canPrefetchJobs(applied, page)
  const [jobsResponse, categoriesResponse] = await Promise.all([
    prefetchJobs
      ? serverRequest<ApiResponse<PaginatedContent<Job>>>(`/api/jobs/paginated-search?${queryString}`, {
          includeCookies: false,
          next: { revalidate: 300 },
        })
      : null,
    serverRequest<ApiResponse<Category[]>>('/api/categories', {
      includeCookies: false,
      next: { revalidate: 300 },
    }),
  ])

  const queryClient = new QueryClient()
  const normalizedJobs = jobsResponse?.ok ? normalizePaginatedJobsResponse(jobsResponse.data) : null
  const normalizedCategories = categoriesResponse.ok ? normalizeCategoriesResponse(categoriesResponse.data) : null

  if (normalizedJobs) {
    queryClient.setQueryData(queryKeys.jobs(apiParams), normalizedJobs)
  }
  if (normalizedCategories) {
    queryClient.setQueryData(queryKeys.categories, normalizedCategories)
  }

  const jobs = normalizedJobs?.content?.data ?? []

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), jobsItemListJsonLd(jobs)]} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<JobsPageSkeleton />}>
          <JobListView />
        </Suspense>
      </HydrationBoundary>
    </>
  )
}
