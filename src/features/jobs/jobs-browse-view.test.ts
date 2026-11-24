import { describe, expect, it } from 'vitest'
import type { Category, Job } from '@/shared/schemas'
import {
  activePriceRangeId,
  buildJobsHref,
  canPostPortfolio,
  categoryNameForJob,
  countActiveJobFilters,
  customPriceRangeLabel,
  jobCardActions,
  jobPriceRanges,
  jobWorkModeSummary,
  portfolioPriceLabel,
  readJobListFilters,
  toJobSearchParams,
} from './jobs-browse-view'

const params = (search: string) => new URLSearchParams(search)

describe('portfolioPriceLabel', () => {
  it('formats priced services in credits and labels price 0 as Portfolio', () => {
    expect(portfolioPriceLabel(1250)).toBe('From 1,250 credits')
    expect(portfolioPriceLabel(1)).toBe('From 1 credit')
    expect(portfolioPriceLabel(0)).toBe('Portfolio')
    expect(portfolioPriceLabel(null)).toBe('Portfolio')
    expect(portfolioPriceLabel(undefined)).toBe('Portfolio')
  })

  it('never uses a currency sign in price labels or sidebar price ranges', () => {
    expect(portfolioPriceLabel(2500)).not.toContain('$')
    for (const range of jobPriceRanges) {
      expect(range.label).not.toContain('$')
    }
  })
})

describe('jobWorkModeSummary', () => {
  it('shows work mode only for priced services', () => {
    expect(jobWorkModeSummary({ price: 0, workMode: 'ONSITE', serviceArea: 'Hanoi' })).toBeNull()
    expect(jobWorkModeSummary({ price: 500, workMode: 'REMOTE', serviceArea: null })).toBe('Remote')
    expect(jobWorkModeSummary({ price: 500, workMode: 'ONSITE', serviceArea: 'Hanoi' })).toBe('Onsite in Hanoi')
    expect(jobWorkModeSummary({ price: 500, workMode: 'BOTH', serviceArea: 'Da Nang' })).toBe('Remote or onsite in Da Nang')
  })
})

describe('jobCardActions', () => {
  const priced: Pick<Job, 'price' | 'creatorId' | 'user'> = {
    price: 1250,
    creatorId: 10,
    user: { id: 10, name: 'Minh Nguyen', avatar: null },
  }
  const portfolio: Pick<Job, 'price' | 'creatorId' | 'user'> = {
    price: 0,
    creatorId: 10,
    user: { id: 10, name: 'Minh Nguyen', avatar: null },
  }

  it('shows View, Message (open) and Send a proposal for a signed-in non-owner on a priced service', () => {
    expect(jobCardActions(priced, { id: 22, role: 'employer' })).toEqual({
      view: true,
      proposal: true,
      message: 'open',
      edit: false,
    })
  })

  it('hides Send a proposal on a portfolio post (price 0)', () => {
    expect(jobCardActions(portfolio, { id: 22, role: 'employer' })).toEqual({
      view: true,
      proposal: false,
      message: 'open',
      edit: false,
    })
  })

  it('shows View and Edit only for the post owner', () => {
    expect(jobCardActions(priced, { id: 10, role: 'user' })).toEqual({
      view: true,
      proposal: false,
      message: false,
      edit: true,
    })
    expect(jobCardActions(portfolio, { id: 10, role: 'user' })).toEqual({
      view: true,
      proposal: false,
      message: false,
      edit: true,
    })
  })

  it('hides Send a proposal and routes Message to login for a signed-out visitor', () => {
    expect(jobCardActions(priced, null)).toEqual({
      view: true,
      proposal: false,
      message: 'login',
      edit: false,
    })
  })

  it('hides Message when no seller id is present', () => {
    expect(jobCardActions({ price: 500 }, { id: 22, role: 'employer' })).toEqual({
      view: true,
      proposal: true,
      message: false,
      edit: false,
    })
  })
})

describe('canPostPortfolio', () => {
  it('allows only candidates (user) and admins', () => {
    expect(canPostPortfolio('user')).toBe(true)
    expect(canPostPortfolio('admin')).toBe(true)
    expect(canPostPortfolio('employer')).toBe(false)
    expect(canPostPortfolio(undefined)).toBe(false)
    expect(canPostPortfolio(null)).toBe(false)
  })
})

describe('readJobListFilters, buildJobsHref and toJobSearchParams', () => {
  it('reads standard and legacy URL params and ignores invalid values', () => {
    expect(
      readJobListFilters(
        params('keyword= react &categoryId=3&subcategoryId=14&minPrice=0&maxPrice=0&minRating=4&sort=price_asc&page=2'),
      ),
    ).toEqual({
      keyword: 'react',
      categoryId: 3,
      subcategoryId: 14,
      minPrice: 0,
      maxPrice: 0,
      minRating: 4,
      sort: 'price_asc',
      page: 2,
    })

    expect(
      readJobListFilters(params('category=-1&subcategory=abc&minPrice=-5&sort=unknown&page=0')),
    ).toEqual({
      keyword: '',
      categoryId: undefined,
      subcategoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
      sort: '',
      page: 1,
    })
  })

  it('builds a clean URL omitting empty fields and page 1 while preserving zero prices', () => {
    expect(
      buildJobsHref('/jobs', { keyword: '', sort: '' }, 1),
    ).toBe('/jobs')

    expect(
      buildJobsHref(
        '/jobs',
        { keyword: ' QA ', categoryId: 2, subcategoryId: 9, minPrice: 0, maxPrice: 0, sort: 'newest' },
        3,
      ),
    ).toBe('/jobs?keyword=QA&category=2&subcategory=9&minPrice=0&maxPrice=0&sort=newest&page=3')
  })

  it('maps UI filters to the jobsApi.paginated request payload', () => {
    expect(
      toJobSearchParams(
        { keyword: 'Design', categoryId: 4, minPrice: 500, maxPrice: 2000, sort: 'rating_desc' },
        2,
      ),
    ).toEqual({
      page: 2,
      pageSize: 12,
      keyword: 'Design',
      categoryId: 4,
      minPrice: 500,
      maxPrice: 2000,
      sort: 'rating_desc',
    })
  })
})

describe('price ranges and helpers', () => {
  it('detects preset and custom price ranges', () => {
    expect(activePriceRangeId(undefined, undefined)).toBe('')
    expect(activePriceRangeId(0, 0)).toBe('portfolio')
    expect(activePriceRangeId(1, 500)).toBe('up_to_500')
    expect(activePriceRangeId(5000, undefined)).toBe('over_5000')
    expect(activePriceRangeId(100, 300)).toBe('custom')
    expect(customPriceRangeLabel(100, 300)).toBe('100 credits to 300 credits')
    expect(customPriceRangeLabel(100, undefined)).toBe('100 credits and up')
    expect(customPriceRangeLabel(undefined, 300)).toBe('Up to 300 credits')
  })

  it('counts active sidebar filters without counting keyword or sort', () => {
    expect(countActiveJobFilters({ keyword: 'React', sort: 'newest' })).toBe(0)
    expect(
      countActiveJobFilters({ keyword: 'React', categoryId: 2, subcategoryId: 5, minPrice: 0, maxPrice: 0, sort: 'newest' }),
    ).toBe(3)
  })

  it('resolves a parent category name from the loaded categories when missing on the job', () => {
    const categories: Category[] = [
      { id: 1, name: 'Design', subcategories: [{ id: 11, name: 'Product Design', categoryId: 1 }] },
    ]
    expect(categoryNameForJob({ subcategoryId: 11 }, categories)).toBe('Design')
    expect(
      categoryNameForJob({ subcategory: { id: 11, name: 'Product Design', category: { id: 1, name: 'Design' } } }, []),
    ).toBe('Design')
  })
})
