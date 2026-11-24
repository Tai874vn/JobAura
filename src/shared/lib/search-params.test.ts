import { describe, expect, it } from 'vitest'
import { toQueryString, toUrlSearchParams } from './search-params'

describe('toUrlSearchParams', () => {
  it('turns the Next.js searchParams object into URLSearchParams, taking the first of repeated values', () => {
    const params = toUrlSearchParams({ keyword: 'react', level: ['junior', 'senior'], empty: undefined })

    expect(params.get('keyword')).toBe('react')
    expect(params.get('level')).toBe('junior')
    expect(params.has('empty')).toBe(false)
  })

  it('gives empty params when there are none', () => {
    expect(toUrlSearchParams(undefined).toString()).toBe('')
    expect(toUrlSearchParams(null).toString()).toBe('')
  })
})

describe('toQueryString', () => {
  it('drops empty, null and undefined values and encodes the rest', () => {
    expect(toQueryString({ page: 1, pageSize: 12, keyword: 'ux & ui', sort: '', categoryId: undefined, minPrice: null })).toBe(
      'page=1&pageSize=12&keyword=ux+%26+ui',
    )
  })

  it('keeps a zero', () => {
    expect(toQueryString({ minPrice: 0 })).toBe('minPrice=0')
  })
})
