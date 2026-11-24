import { describe, expect, it } from 'vitest'
import { maxHiringPostPage, rolesPastLastPage } from './hiring-posts-browse'

describe('hiring post page limit', () => {
  it('matches the backend cap of 100 pages', () => {
    expect(maxHiringPostPage).toBe(100)
  })

  it('counts the roles past the last page the list can show', () => {
    expect(rolesPastLastPage(5000, 100, 10)).toBe(4000)
    expect(rolesPastLastPage(60, 6, 10)).toBe(0)
    expect(rolesPastLastPage(0, 1, 10)).toBe(0)
  })
})
