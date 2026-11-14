import { describe, expect, it } from 'vitest'
import { calculateProfileCompletion, getUserPosts } from './profile-posts'
import type { Job, UserProfile } from '@/shared/schemas'

describe('profile posts helpers', () => {
  it('returns posts authored by the profile user newest first', () => {
    const jobs = [
      job({ id: 1, creatorId: 4, createdAt: '2026-01-01T00:00:00.000Z' }),
      job({ id: 2, creatorId: 7, createdAt: '2026-03-01T00:00:00.000Z' }),
      job({ id: 3, user: { id: 4, name: 'Ava', avatar: null }, createdAt: '2026-02-01T00:00:00.000Z' }),
    ]

    expect(getUserPosts(jobs, 4).map((item) => item.id)).toEqual([3, 1])
  })

  it('calculates profile completion from public profile fields', () => {
    const profile = {
      id: 4,
      name: 'Ava Nguyen',
      email: 'ava@example.com',
      headline: 'Product designer',
      bio: 'Designs marketplace flows.',
      location: 'Bangkok',
      website: 'https://example.com',
      avatar: '/avatar.png',
      coverImage: '/cover.png',
      skills: [{ name: 'Figma' }],
      certifications: [],
      portfolio: [{ title: 'Case study' }],
    } satisfies Partial<UserProfile>

    expect(calculateProfileCompletion(profile as UserProfile)).toBe(90)
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
