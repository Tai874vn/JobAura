import { describe, expect, it } from 'vitest'
import { getUserPosts } from './profile-posts'
import type { Job } from '@/shared/schemas'

describe('profile posts helpers', () => {
  it('returns posts authored by the profile user newest first', () => {
    const jobs = [
      job({ id: 1, creatorId: 4, createdAt: '2026-01-01T00:00:00.000Z' }),
      job({ id: 2, creatorId: 7, createdAt: '2026-03-01T00:00:00.000Z' }),
      job({ id: 3, user: { id: 4, name: 'Ava', avatar: null }, createdAt: '2026-02-01T00:00:00.000Z' }),
    ]

    expect(getUserPosts(jobs, 4).map((item) => item.id)).toEqual([3, 1])
  })
})

function job(overrides: Partial<Job>): Job {
  return {
    id: 0,
    title: 'Service',
    price: 100,
    reviews: 0,
    rating: 0,
    ...overrides,
  }
}
