import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  canPrefetchHiringPosts,
  readHiringPostFilters,
  toHiringPostFacetParams,
  toHiringPostQueryParams,
} from '@/features/hiring/hiring-posts-browse'
import { HiringPostsPage } from '@/features/hiring/hiring-posts-page'
import { HiringPostsPageSkeleton } from '@/features/hiring/hiring-posts-skeleton'
import type { FacetCount, HiringPostFacets } from '@/shared/api/endpoints/hiring-posts'
import { normalizePaginatedHiringPostsResponse } from '@/shared/api/normalizers'
import { queryKeys } from '@/shared/api/query-keys'
import { serverRequest } from '@/shared/api/server'
import { toQueryString, toUrlSearchParams, type RawSearchParams } from '@/shared/lib/search-params'
import { buildPageMetadata, JsonLd, organizationJsonLd, websiteJsonLd } from '@/shared/lib/seo'
import { hiringPostsItemListJsonLd } from '@/shared/lib/seo-jsonld'
import type { ApiResponse, HiringPost, PaginatedContent } from '@/shared/schemas'

export const metadata: Metadata = buildPageMetadata({
  title: 'Hiring posts',
  description:
    'Browse open roles from recruiters on JobAura. Filter by occupation, experience level, employment type, and location.',
  canonical: '/hiring-posts',
})

// The first paint for visitors and search engines: public data read without cookies on the server and handed to
// the list under the same React Query keys it uses, so it shows real cards at once. Signed-in viewers then load
// their own "applied" status in the browser; nothing per-user is cached on the server.
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<RawSearchParams>
}) {
  const urlSearchParams = toUrlSearchParams(await searchParams)
  const { applied, page } = readHiringPostFilters(urlSearchParams)
  const params = toHiringPostQueryParams(applied, page)
  const facetParams = toHiringPostFacetParams(applied)

  // The plain list (no search, filter or sort) on its first pages is fetched here; any other address is left to the
  // browser, as before, so random ?keyword= values cannot fill the server cache (see canPrefetchHiringPosts). The
  // facet counts follow the same rule; the location list has one fixed address, so it is always fetched.
  const prefetchPosts = canPrefetchHiringPosts(applied, page)
  const cached = { includeCookies: false, next: { revalidate: 60 } } as const

  const [postsResponse, facetsResponse, locationsResponse] = await Promise.all([
    prefetchPosts
      ? serverRequest<ApiResponse<PaginatedContent<HiringPost>>>(`/api/hiring-posts?${toQueryString(params)}`, cached)
      : null,
    prefetchPosts ? serverRequest<ApiResponse<HiringPostFacets>>('/api/hiring-posts/facets', cached) : null,
    serverRequest<ApiResponse<FacetCount[]>>('/api/hiring-posts/locations', cached),
  ])

  const queryClient = new QueryClient()
  const normalizedPosts = postsResponse?.ok ? normalizePaginatedHiringPostsResponse(postsResponse.data) : null

  if (normalizedPosts) {
    queryClient.setQueryData(queryKeys.hiringPosts(params), normalizedPosts)
  }
  if (facetsResponse?.ok) {
    queryClient.setQueryData(queryKeys.hiringPostFacets(facetParams), facetsResponse.data)
  }
  if (locationsResponse.ok) {
    queryClient.setQueryData(queryKeys.hiringPostLocations, locationsResponse.data)
  }

  const posts = normalizedPosts?.content?.data ?? []

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), hiringPostsItemListJsonLd(posts)]} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<HiringPostsPageSkeleton />}>
          <HiringPostsPage />
        </Suspense>
      </HydrationBoundary>
    </>
  )
}
