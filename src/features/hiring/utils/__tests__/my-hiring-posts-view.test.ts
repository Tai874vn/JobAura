import { describe, expect, it } from 'vitest'
import type { HiringPost } from '@/shared/schemas'
import {
  arrangeMyPosts, myPostsHref, myPostsPage, myPostsRequest, myPostsStatsLine, readMyPostsFilters, statusCounts, stepChips,
} from '../my-hiring-posts-view'

const post = (change: Partial<HiringPost>) => ({
  id: 1, status: 'OPEN', applicationCount: 0, createdAt: '2026-11-01T00:00:00Z', ...change,
}) as HiringPost
const params = (search: string) => new URLSearchParams(search)

describe('myPostsStatsLine', () => {
  it('reads "5 open · 1 closed · 37 applicants"', () => {
    const posts = [
      ...Array.from({ length: 5 }, (_, i) => post({ id: i + 1, applicationCount: 7 })),
      post({ id: 9, status: 'CLOSED', applicationCount: 2 }),
    ]
    expect(myPostsStatsLine(posts)).toBe('5 open · 1 closed · 37 applicants')
  })

  it('says "1 applicant" for one and is empty with no posts', () => {
    expect(myPostsStatsLine([post({ applicationCount: 1 })])).toBe('1 open · 0 closed · 1 applicant')
    expect(myPostsStatsLine([])).toBe('')
  })
})

describe('statusCounts', () => {
  it('counts open and closed posts', () => {
    expect(statusCounts([post({}), post({ id: 2 }), post({ id: 3, status: 'CLOSED' })])).toEqual({ open: 2, closed: 1 })
  })
})

describe('readMyPostsFilters and myPostsHref', () => {
  it('reads keyword, status, sort and page from the address and drops unknown values', () => {
    expect(readMyPostsFilters(params('keyword=react&status=closed&sort=applicants&page=3')))
      .toEqual({ keyword: 'react', status: 'closed', sort: 'applicants', page: 3 })
    expect(readMyPostsFilters(params('status=deleted&sort=salary&page=-2')))
      .toEqual({ keyword: '', status: '', sort: '', page: 1 })
  })

  it('writes only the values that are set, and page only past 1', () => {
    expect(myPostsHref('/my-hiring-posts', { keyword: '', status: '', sort: '' }, 1)).toBe('/my-hiring-posts')
    expect(myPostsHref('/my-hiring-posts', { keyword: ' react ', status: 'open', sort: 'applicants' }, 2))
      .toBe('/my-hiring-posts?keyword=react&status=open&sort=applicants&page=2')
  })
})

describe('myPostsRequest', () => {
  it('asks the server for up to 100 of the caller own posts, with the keyword when there is one', () => {
    expect(myPostsRequest('')).toEqual({ page: 1, pageSize: 100 })
    expect(myPostsRequest(' react ')).toEqual({ page: 1, pageSize: 100, keyword: 'react' })
  })
})

describe('arrangeMyPosts', () => {
  const posts = [
    post({ id: 1, createdAt: '2026-11-01T00:00:00Z', applicationCount: 9 }),
    post({ id: 2, createdAt: '2026-11-10T00:00:00Z', applicationCount: 1, status: 'CLOSED' }),
    post({ id: 3, createdAt: '2026-11-05T00:00:00Z', applicationCount: 4 }),
  ]

  it('puts the newest first by default', () => {
    expect(arrangeMyPosts(posts, { status: '', sort: '' }).map((p) => p.id)).toEqual([2, 3, 1])
  })

  it('sorts by most applicants, newest first on a tie', () => {
    const tied = [...posts, post({ id: 4, createdAt: '2026-11-20T00:00:00Z', applicationCount: 9 })]
    expect(arrangeMyPosts(tied, { status: '', sort: 'applicants' }).map((p) => p.id)).toEqual([4, 1, 3, 2])
  })

  it('keeps only open or only closed posts', () => {
    expect(arrangeMyPosts(posts, { status: 'open', sort: '' }).map((p) => p.id)).toEqual([3, 1])
    expect(arrangeMyPosts(posts, { status: 'closed', sort: '' }).map((p) => p.id)).toEqual([2])
  })
})

describe('myPostsPage', () => {
  it('cuts one page and clamps a page past the end', () => {
    const list = Array.from({ length: 23 }, (_, i) => i)
    expect(myPostsPage(list, 2, 10)).toEqual({ items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], page: 2, totalPages: 3 })
    expect(myPostsPage(list, 9, 10)).toEqual({ items: [20, 21, 22], page: 3, totalPages: 3 })
    expect(myPostsPage([], 1, 10)).toEqual({ items: [], page: 1, totalPages: 1 })
  })
})

describe('stepChips', () => {
  it('links each step to the applicants page filtered to it', () => {
    const chips = stepChips(7, { APPLIED: 3, REVIEWING: 0, INTERVIEWING: 1, OFFERED: 0, HIRED: 1 })
    expect(chips.map((chip) => [chip.label, chip.count, chip.href])).toEqual([
      ['New', 3, '/my-hiring-posts/7/applicants?status=APPLIED'],
      ['Shortlisted', 0, '/my-hiring-posts/7/applicants?status=REVIEWING'],
      ['Interview', 1, '/my-hiring-posts/7/applicants?status=INTERVIEWING'],
      ['Offer', 0, '/my-hiring-posts/7/applicants?status=OFFERED'],
      ['Hired', 1, '/my-hiring-posts/7/applicants?status=HIRED'],
    ])
  })

  it('adds Not selected only when its count is known', () => {
    const chips = stepChips(7, { APPLIED: 0, REVIEWING: 0, INTERVIEWING: 0, OFFERED: 0, HIRED: 0, REJECTED: 2 })
    expect(chips.at(-1)).toEqual({ status: 'REJECTED', label: 'Not selected', count: 2, href: '/my-hiring-posts/7/applicants?status=REJECTED' })
    expect(stepChips(7, undefined)).toHaveLength(5)
  })
})
