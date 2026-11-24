import type { ApplicationStatus, HiringPost } from '@/shared/schemas'
import { applicantTabs } from '@/features/hiring-pipeline/applicants-page'

/**
 * The pure parts of My hiring posts: what the address says, what the server is asked, and how the loaded posts
 * are filtered, sorted, cut into pages and counted.
 *
 * GET /hiring-posts/mine only takes page, pageSize (at most 100) and keyword, always returns the caller's own
 * posts, and orders them by last update. So the page asks for up to 100 posts with the keyword, and the status
 * filter, its counts, the sort and the pages are worked out here from what came back.
 */

export const myPostsPageSize = 10
/** The most posts one request may ask for (the backend's pageSize limit). */
export const myPostsLoadLimit = 100

export type MyPostsStatus = '' | 'open' | 'closed'
export type MyPostsSort = '' | 'applicants'
export type MyPostsFilters = { keyword: string; status: MyPostsStatus; sort: MyPostsSort }

export const myPostsSortLabels: Record<MyPostsSort, string> = { '': 'Newest', applicants: 'Most applicants' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** Open and closed posts in a list. */
export function statusCounts(posts: Pick<HiringPost, 'status'>[]) {
  const open = posts.filter((post) => post.status === 'OPEN').length
  return { open, closed: posts.length - open }
}

/** "5 open · 1 closed · 37 applicants" for the hero; empty when there are no posts. */
export function myPostsStatsLine(posts: Pick<HiringPost, 'status' | 'applicationCount'>[]) {
  if (!posts.length) return ''
  const { open, closed } = statusCounts(posts)
  const applicants = posts.reduce((sum, post) => sum + (post.applicationCount ?? 0), 0)
  return `${open} open · ${closed} closed · ${plural(applicants, 'applicant', 'applicants')}`
}

/** The filters and page in the address; unknown values read as "not set". */
export function readMyPostsFilters(params: Pick<URLSearchParams, 'get'>): MyPostsFilters & { page: number } {
  const status = params.get('status')
  const sort = params.get('sort')
  return {
    keyword: params.get('keyword')?.trim() ?? '',
    status: status === 'open' || status === 'closed' ? status : '',
    sort: sort === 'applicants' ? sort : '',
    page: Math.max(1, Math.floor(Number(params.get('page'))) || 1),
  }
}

/** The address for some filters and a page; empty values and page 1 are left out. */
export function myPostsHref(pathname: string, filters: MyPostsFilters, page: number) {
  const url = new URLSearchParams()
  if (filters.keyword.trim()) url.set('keyword', filters.keyword.trim())
  if (filters.status) url.set('status', filters.status)
  if (filters.sort) url.set('sort', filters.sort)
  if (page > 1) url.set('page', String(page))
  const search = url.toString()
  return search ? `${pathname}?${search}` : pathname
}

/** What GET /hiring-posts/mine is asked: the first 100 posts, matched by the keyword on the server. */
export function myPostsRequest(keyword: string) {
  const trimmed = keyword.trim()
  return trimmed ? { page: 1, pageSize: myPostsLoadLimit, keyword: trimmed } : { page: 1, pageSize: myPostsLoadLimit }
}

const createdTime = (post: Pick<HiringPost, 'createdAt'>) => (post.createdAt ? new Date(post.createdAt).getTime() : 0)
const newestFirst = (a: Pick<HiringPost, 'id' | 'createdAt'>, b: Pick<HiringPost, 'id' | 'createdAt'>) =>
  createdTime(b) - createdTime(a) || b.id - a.id

/** The posts that pass the status filter, newest first or with the most applicants first. */
export function arrangeMyPosts<T extends Pick<HiringPost, 'id' | 'status' | 'createdAt' | 'applicationCount'>>(
  posts: T[], { status, sort }: Pick<MyPostsFilters, 'status' | 'sort'>,
): T[] {
  const kept = status ? posts.filter((post) => post.status === (status === 'open' ? 'OPEN' : 'CLOSED')) : [...posts]
  return kept.sort(sort === 'applicants'
    ? (a, b) => (b.applicationCount ?? 0) - (a.applicationCount ?? 0) || newestFirst(a, b)
    : newestFirst)
}

/** One page of a list; a page past the end shows the last page. */
export function myPostsPage<T>(list: T[], page: number, size = myPostsPageSize) {
  const totalPages = Math.max(1, Math.ceil(list.length / size))
  const current = Math.min(Math.max(1, page), totalPages)
  return { items: list.slice((current - 1) * size, current * size), page: current, totalPages }
}

export type StepChip = { status: ApplicationStatus; label: string; count: number; href: string }

const steps: ApplicationStatus[] = ['APPLIED', 'REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED']

/**
 * "Applicants by step": the five pipeline steps, then Not selected when its count is known, each linking to the
 * applicants page on that tab. The labels are the applicants page tab names.
 */
export function stepChips(postId: number, counts: Partial<Record<ApplicationStatus, number>> | undefined): StepChip[] {
  const shown = counts?.REJECTED != null ? [...steps, 'REJECTED' as const] : steps
  return shown.map((status) => ({
    status,
    label: applicantTabs.find((tab) => tab.key === status)?.label ?? status,
    count: counts?.[status] ?? 0,
    href: `/my-hiring-posts/${postId}/applicants?status=${status}`,
  }))
}
