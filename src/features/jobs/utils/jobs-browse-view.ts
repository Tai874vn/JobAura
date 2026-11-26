import { credits } from '@/shared/lib/credits'
import type { Category, Job, JobSearchParams } from '@/shared/schemas'
import { getSellerId } from './seller-profile'
import { isPortfolioPost, servicePriceLabel, workModeLine } from './service-price'

/**
 * Pure logic for the Candidate portfolios (/jobs) browse page:
 * reading and building URL query parameters (the ?key=value part of the web address),
 * price ranges in credits, price and work-mode labels, and which card actions show for each viewer.
 */

export const jobsPageSize = 12

// @find jobs search search-in logic [all] — the fields the keyword box searches: delete a line to stop searching it
/**
 * The fields the keyword box searches, sent as ?searchIn=... Delete a line to stop searching that field.
 * The backend accepts only: title, shortDescription, description, sellerName, subcategory, category.
 */
export const jobSearchIn = [
  'title',
  'shortDescription',
  'description',
  'sellerName',
  'subcategory',
  'category',
] as const
/** The longest search text read from the URL; longer text is cut, so a huge ?keyword= cannot reach the backend. */
export const maxJobKeywordLength = 100
/** The server fetches the first paint only for the plain list, up to this page (see canPrefetchJobs). */
export const maxPrefetchJobsPage = 10

export const popularPortfolioTerms = [
  'Software Engineer',
  'Data Analyst',
  'Product Designer',
  'QA',
  'Marketing',
] as const

/** Sort values the backend /api/jobs/paginated-search endpoint accepts, plus empty string for default order. */
export const jobSorts = ['', 'newest', 'price_asc', 'price_desc', 'rating_desc'] as const
export type JobSort = (typeof jobSorts)[number]

export const jobSortLabels: Record<JobSort, string> = {
  '': 'Default',
  newest: 'Newest',
  price_asc: 'Lowest price',
  price_desc: 'Highest price',
  rating_desc: 'Highest rated',
}

export type JobPriceRangeId = '' | 'portfolio' | 'up_to_500' | '500_to_2000' | '2000_to_5000' | 'over_5000'

export type JobPriceRange = {
  id: Exclude<JobPriceRangeId, ''>
  label: string
  minPrice?: number
  maxPrice?: number
}

/**
 * Sidebar price choices in credits.
 * Price 0 is a portfolio post (no rate); priced ranges start at 1 credit so portfolio posts stay separate.
 */
export const jobPriceRanges: readonly JobPriceRange[] = [
  { id: 'portfolio', label: 'Portfolio posts', minPrice: 0, maxPrice: 0 },
  { id: 'up_to_500', label: `Up to ${credits(500)}`, minPrice: 1, maxPrice: 500 },
  { id: '500_to_2000', label: `${credits(500)} to ${credits(2000)}`, minPrice: 500, maxPrice: 2000 },
  { id: '2000_to_5000', label: `${credits(2000)} to ${credits(5000)}`, minPrice: 2000, maxPrice: 5000 },
  { id: 'over_5000', label: `${credits(5000)} and up`, minPrice: 5000 },
]

export type JobListFilters = {
  keyword: string
  categoryId?: number
  subcategoryId?: number
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort: JobSort
}

export type JobViewer = {
  id: number
  role?: string | null
} | null | undefined

export type JobCardActions = {
  view: true
  /** Only priced services for a signed-in viewer who does not own the post. */
  proposal: boolean
  /** 'open' triggers the in-app chat event; 'login' sends a signed-out visitor to sign in; false hides it. */
  message: 'open' | 'login' | false
  /** Only the post owner can edit it. */
  edit: boolean
}

/** Candidates (role `user`) and admins can publish portfolio posts from /jobs. */
export function canPostPortfolio(role?: string | null): boolean {
  return role === 'user' || role === 'admin'
}

/** Price text for a portfolio card: "From 1,250 credits" when priced, or "Portfolio" when price is 0. */
export function portfolioPriceLabel(price?: number | null): string {
  return servicePriceLabel(price) ?? 'Portfolio'
}

/** Work mode text shown on priced services only; portfolio posts (price 0) return null. */
export function jobWorkModeSummary(job: Pick<Job, 'price' | 'workMode' | 'serviceArea'>): string | null {
  if (isPortfolioPost(job.price)) return null
  return workModeLine(job.workMode, job.serviceArea)
}

/** Decides which actions appear on one portfolio result card for the current viewer. */
export function jobCardActions(
  job: Pick<Job, 'price' | 'creatorId' | 'user'>,
  viewer: JobViewer,
): JobCardActions {
  const sellerId = getSellerId(job as Job)
  const isSignedIn = Boolean(viewer && viewer.id > 0)
  const isOwner = Boolean(isSignedIn && sellerId && viewer!.id === sellerId)
  const priced = !isPortfolioPost(job.price)

  return {
    view: true,
    proposal: priced && isSignedIn && !isOwner,
    message: !isOwner && Boolean(sellerId) ? (isSignedIn ? 'open' : 'login') : false,
    edit: isOwner,
  }
}

/** Finds which price preset matches the active URL minPrice/maxPrice, or 'custom' for any other numbers. */
export function activePriceRangeId(minPrice?: number, maxPrice?: number): JobPriceRangeId | 'custom' {
  if (minPrice === undefined && maxPrice === undefined) return ''
  const match = jobPriceRanges.find((range) => range.minPrice === minPrice && range.maxPrice === maxPrice)
  return match ? match.id : 'custom'
}

/** Human-readable label for a custom minPrice/maxPrice combination from a bookmarked or edited URL. */
export function customPriceRangeLabel(minPrice?: number, maxPrice?: number): string {
  if (minPrice !== undefined && maxPrice !== undefined) return `${credits(minPrice)} to ${credits(maxPrice)}`
  if (minPrice !== undefined) return `${credits(minPrice)} and up`
  if (maxPrice !== undefined) return `Up to ${credits(maxPrice)}`
  return 'All prices'
}

/** Reads filters and page from the URL query string; unknown or invalid values fall back to empty defaults. */
export function readJobListFilters(params: Pick<URLSearchParams, 'get'>): JobListFilters & { page: number } {
  return {
    keyword: params.get('keyword')?.trim().slice(0, maxJobKeywordLength).trim() ?? '',
    categoryId: positiveInteger(params.get('category') ?? params.get('categoryId')),
    subcategoryId: positiveInteger(params.get('subcategory') ?? params.get('subcategoryId')),
    minPrice: nonNegativeNumber(params.get('minPrice')),
    maxPrice: nonNegativeNumber(params.get('maxPrice')),
    minRating: nonNegativeNumber(params.get('minRating')),
    sort: parseJobSort(params.get('sort')),
    page: positiveInteger(params.get('page')) ?? 1,
  }
}

/** Builds the /jobs URL for a set of filters and a page; empty values and page 1 are left out. */
export function buildJobsHref(pathname: string, filters: JobListFilters, page = 1): string {
  const url = new URLSearchParams()
  const keyword = filters.keyword.trim()
  if (keyword) url.set('keyword', keyword)
  if (filters.categoryId !== undefined) url.set('category', String(filters.categoryId))
  if (filters.subcategoryId !== undefined) url.set('subcategory', String(filters.subcategoryId))
  if (filters.minPrice !== undefined) url.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== undefined) url.set('maxPrice', String(filters.maxPrice))
  if (filters.minRating !== undefined) url.set('minRating', String(filters.minRating))
  if (filters.sort) url.set('sort', filters.sort)
  if (page > 1) url.set('page', String(page))
  const search = url.toString()
  return search ? `${pathname}?${search}` : pathname
}

/** Converts parsed UI filters into the exact query object sent to jobsApi.paginated. */
export function toJobSearchParams(filters: JobListFilters, page: number, pageSize = jobsPageSize): JobSearchParams {
  const keyword = filters.keyword.trim()
  return {
    page,
    pageSize,
    ...(keyword ? { keyword, searchIn: jobSearchIn.join(',') } : {}),
    ...(filters.categoryId !== undefined ? { categoryId: filters.categoryId } : {}),
    ...(filters.subcategoryId !== undefined ? { subcategoryId: filters.subcategoryId } : {}),
    ...(filters.minPrice !== undefined ? { minPrice: filters.minPrice } : {}),
    ...(filters.maxPrice !== undefined ? { maxPrice: filters.maxPrice } : {}),
    ...(filters.minRating !== undefined ? { minRating: filters.minRating } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
  }
}

/**
 * Whether the /jobs server page should fetch the first paint itself. Only the plain list (no search, filter or sort)
 * on its first pages: those few addresses share one server cache entry each. Any other address is left to the
 * browser, as before, so random ?keyword= values cannot fill the server cache or reach the backend through it.
 */
export function canPrefetchJobs(filters: JobListFilters, page: number): boolean {
  return countActiveJobFilters(filters) === 0 && !filters.keyword && !filters.sort && page <= maxPrefetchJobsPage
}

/** Counts active sidebar filters for the mobile Filters button badge (excludes keyword and sort). */
export function countActiveJobFilters(filters: JobListFilters): number {
  let count = 0
  if (filters.categoryId !== undefined) count += 1
  if (filters.subcategoryId !== undefined) count += 1
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1
  if (filters.minRating !== undefined) count += 1
  return count
}

/** Finds the parent category name for a job, using the loaded categories list when the job omits it. */
export function categoryNameForJob(job: Pick<Job, 'subcategory' | 'subcategoryId'>, categories: Category[]): string | undefined {
  const direct = job.subcategory?.category?.name?.trim()
  if (direct) return direct
  const parentId = job.subcategory?.categoryId ?? job.subcategory?.category?.id
  if (parentId) return categories.find((category) => category.id === parentId)?.name
  const subId = job.subcategory?.id ?? job.subcategoryId
  if (!subId) return undefined
  return categories.find((category) => category.subcategories?.some((sub) => sub.id === subId))?.name
}

function positiveInteger(value: string | null): number | undefined {
  if (!value || !value.trim()) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function nonNegativeNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function parseJobSort(value: string | null): JobSort {
  if (value === 'newest' || value === 'price_asc' || value === 'price_desc' || value === 'rating_desc') return value
  return ''
}
