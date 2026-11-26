import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import { hiringPostsConfig } from '../../config/hiring-posts'
import { canPrefetchHiringPosts, hiringPostSearchIn, readHiringPostFilters, toHiringPostFacetParams, toHiringPostQueryParams } from '../hiring-posts-browse'

const url = (query: string) => new URLSearchParams(query)

describe('readHiringPostFilters', () => {
  it('reads every filter from the URL and starts on page 1', () => {
    const { applied, page } = readHiringPostFilters(url('keyword=react&occupation=2512.1,2512.2&level=senior&employmentType=Full-time&location=Hanoi&sort=newest'))

    expect(applied).toEqual({
      keyword: 'react',
      occupation: '2512.1,2512.2',
      level: 'senior',
      employmentType: 'Full-time',
      location: 'Hanoi',
      sort: 'newest',
    })
    expect(page).toBe(1)
  })

  it('keeps every sort the Sort menu offers (config sorts), so picking one really changes the order', () => {
    for (const { value } of hiringPostsConfig.sorts) {
      expect(readHiringPostFilters(url(`sort=${value}`)).applied.sort).toBe(value)
    }
  })

  it('drops an unknown sort and keeps the page between 1 and 100', () => {
    expect(readHiringPostFilters(url('sort=cheapest')).applied.sort).toBe('')
    expect(readHiringPostFilters(url('page=500')).page).toBe(100)
    expect(readHiringPostFilters(url('page=0')).page).toBe(1)
    expect(readHiringPostFilters(url('page=-3')).page).toBe(1)
    expect(readHiringPostFilters(url('page=abc')).page).toBe(1)
    expect(readHiringPostFilters(url('page=2.7')).page).toBe(2)
  })
})

describe('hiring post request params', () => {
  it('sends only the filters that are set, with the page and page size', () => {
    const { applied } = readHiringPostFilters(url('keyword=react&sort=salary_high'))

    expect(toHiringPostQueryParams(applied, 3)).toEqual({
      page: 3,
      pageSize: 10,
      keyword: 'react',
      sort: 'salary_high',
      searchIn: hiringPostSearchIn.join(','),
    })
  })

  it('leaves the page, page size and sort out of the facet counts', () => {
    const { applied } = readHiringPostFilters(url('keyword=react&level=junior&sort=newest&page=4'))

    expect(toHiringPostFacetParams(applied)).toEqual({ keyword: 'react', level: 'junior', searchIn: hiringPostSearchIn.join(',') })
  })

  it('builds the same params for the server first paint and the browser (same React Query key)', () => {
    const query = 'location=Da+Nang&employmentType=Contract&page=2'
    const server = readHiringPostFilters(new URLSearchParams(query))
    const client = readHiringPostFilters(new URLSearchParams(`?${query}`))

    expect(toHiringPostQueryParams(server.applied, server.page)).toEqual(toHiringPostQueryParams(client.applied, client.page))
    // The server stores the list under the visitor ('anon') key: the one a visitor's browser reads, never a
    // signed-in viewer's.
    const serverKey = queryKeys.hiringPosts(toHiringPostQueryParams(server.applied, server.page))
    expect(serverKey).toEqual(queryKeys.hiringPosts(toHiringPostQueryParams(client.applied, client.page), undefined))
    expect(serverKey).not.toEqual(queryKeys.hiringPosts(toHiringPostQueryParams(client.applied, client.page), 7))
  })
})

describe('server first paint for /hiring-posts', () => {
  it('is fetched on the server only for the plain list on its first pages', () => {
    for (const query of ['', 'page=3', 'page=10']) {
      const { applied, page } = readHiringPostFilters(url(query))
      expect(canPrefetchHiringPosts(applied, page)).toBe(true)
    }
    for (const query of ['keyword=react', 'location=Hanoi', 'level=senior', 'sort=newest', 'page=11']) {
      const { applied, page } = readHiringPostFilters(url(query))
      expect(canPrefetchHiringPosts(applied, page)).toBe(false)
    }
  })

  it('cuts very long filter text to 100 characters', () => {
    const { applied } = readHiringPostFilters(url(`keyword=${'a'.repeat(500)}&location=${'b'.repeat(300)}`))

    expect(applied.keyword).toHaveLength(100)
    expect(applied.location).toHaveLength(100)
  })
})

describe('keyword search fields (searchIn)', () => {
  it('sends the fields listed in hiringPostSearchIn, only when there is a keyword', () => {
    expect(hiringPostSearchIn).toContain('title')
    const withKeyword = toHiringPostQueryParams(readHiringPostFilters(url('keyword=react')).applied, 1)
    expect(withKeyword.searchIn).toBe('title,description,requirements,location,employmentType,companyName,recruiterName,skills')
    const without = toHiringPostQueryParams(readHiringPostFilters(url('level=Junior')).applied, 1)
    expect(without).not.toHaveProperty('searchIn')
  })
})
