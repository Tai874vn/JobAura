import { hiringPostSorts, type HiringPostFilters, type HiringPostSort } from '@/shared/api/endpoints/hiring-posts'

/**
 * Pure URL-filter logic for the public Hiring posts (/hiring-posts) page.
 * Shared between the Server Component (first paint fetch) and the Client Component
 * (interactive filters) so both build identical React Query keys and API requests.
 */

export const hiringPostsPageSize = 10

/** The backend lists at most this many pages of open posts (MAX_HIRING_POST_PAGE); later pages are a 400. */
export const maxHiringPostPage = 100

/** The longest text read from the URL for a filter; longer text is cut, so a huge ?keyword= cannot reach the backend. */
export const maxHiringPostFilterLength = 100
/** The server fetches the first paint only for the plain list, up to this page (see canPrefetchHiringPosts). */
export const maxPrefetchHiringPostPage = 10

export const hiringPostFilterKeys = ['keyword', 'occupation', 'level', 'employmentType', 'location', 'sort'] as const
export type HiringPostFilterKey = (typeof hiringPostFilterKeys)[number]
export type HiringPostAppliedFilters = Record<HiringPostFilterKey, string>

/** How many matching roles lie past the last page the list can show, so the reader can be asked to narrow it. */
export function rolesPastLastPage(total: number, totalPages: number, size = hiringPostsPageSize) {
  return Math.max(0, total - totalPages * size)
}

function parseHiringPostSort(value: string | null): HiringPostSort | '' {
  if (!value) return ''
  return (hiringPostSorts as readonly string[]).includes(value) ? (value as HiringPostSort) : ''
}

/** Reads the URL query params into normalized filter strings and a safe page number (1..100). */
export function readHiringPostFilters(params: Pick<URLSearchParams, 'get'>): {
  applied: HiringPostAppliedFilters
  page: number
} {
  const applied = Object.fromEntries(
    hiringPostFilterKeys.map((key) => [
      key,
      key === 'sort' ? parseHiringPostSort(params.get(key)) : (params.get(key) ?? '').slice(0, maxHiringPostFilterLength),
    ]),
  ) as HiringPostAppliedFilters

  // A hand-edited ?page=500 would only get a 400, so clamp to 1..maxHiringPostPage.
  const rawPage = Math.trunc(Number(params.get('page')))
  const page = Math.min(maxHiringPostPage, Math.max(1, Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1))

  return { applied, page }
}

/**
 * Whether the /hiring-posts server page should fetch the first paint itself. Only the plain list (no search, filter
 * or sort) on its first pages: those few addresses share one server cache entry each. Any other address is left to
 * the browser, as before, so random ?keyword= values cannot fill the server cache or reach the backend through it.
 */
export function canPrefetchHiringPosts(applied: HiringPostAppliedFilters, page: number): boolean {
  return hiringPostFilterKeys.every((key) => !applied[key]) && page <= maxPrefetchHiringPostPage
}

/** Builds the exact query object sent to `/api/hiring-posts` and used in `queryKeys.hiringPosts`. */
export function toHiringPostQueryParams(
  applied: HiringPostAppliedFilters,
  page: number,
  pageSize = hiringPostsPageSize,
): HiringPostFilters {
  return {
    page,
    pageSize,
    ...Object.fromEntries(hiringPostFilterKeys.filter((key) => applied[key]).map((key) => [key, applied[key]])),
  }
}

/** Builds the exact query object sent to `/api/hiring-posts/facets` and used in `queryKeys.hiringPostFacets`. */
export function toHiringPostFacetParams(
  applied: HiringPostAppliedFilters,
): Omit<HiringPostFilters, 'page' | 'pageSize' | 'sort'> {
  return Object.fromEntries(
    hiringPostFilterKeys.filter((key) => key !== 'sort' && applied[key]).map((key) => [key, applied[key]]),
  )
}
