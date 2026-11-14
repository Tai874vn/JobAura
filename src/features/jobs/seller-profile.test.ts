import { describe, expect, it } from 'vitest'
import { getSellerAvatar, getSellerHref, getSellerName } from './seller-profile'
import type { Job } from '@/shared/schemas'

describe('seller profile helpers', () => {
  it('builds a seller profile link from either creator id or owner object', () => {
    expect(getSellerHref(job({ creatorId: 5 }))).toBe('/profile/5')
    expect(getSellerHref(job({ user: { id: 7, name: 'Lina', avatar: null } }))).toBe('/profile/7')
  })

  it('uses seller avatar when present and falls back when missing', () => {
    expect(getSellerAvatar(job({ user: { id: 5, name: 'Tai', avatar: '/avatars/tai.png' } }))).toBe('/avatars/tai.png')
    expect(getSellerAvatar(job({ user: { id: 5, name: 'Tai', avatar: null } }))).toBeUndefined()
  })

  it('uses seller name from the owner object with a stable fallback', () => {
    expect(getSellerName(job({ user: { id: 5, name: 'Tai', avatar: null } }))).toBe('Tai')
    expect(getSellerName(job({}))).toBe('JobAura seller')
  })
})

function job(overrides: Partial<Job>): Job {
  return {
    id: 1,
    title: 'Service',
    price: 100,
    reviews: 0,
    rating: 0,
    ...overrides,
  }
}
