import { describe, expect, it } from 'vitest'
import { selectFeedCover } from '../feed-cover'

describe('feed profile cover', () => {
  it('uses the stored cover image with legacy fallback', () => {
    expect(selectFeedCover({ coverImage: '/covers/current.jpg', cover: '/covers/legacy.jpg' })).toBe('/covers/current.jpg')
    expect(selectFeedCover({ coverImage: ' ', cover: '/covers/legacy.jpg' })).toBe('/covers/legacy.jpg')
    expect(selectFeedCover({ coverImage: null, cover: null })).toBeNull()
  })
})
