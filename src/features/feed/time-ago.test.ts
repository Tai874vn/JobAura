import { describe, expect, it } from 'vitest'
import { timeAgo } from './time-ago'

const now = new Date('2026-10-12T12:00:00Z')

describe('timeAgo', () => {
  it('uses compact relative buckets', () => {
    expect(timeAgo('2026-10-12T11:59:40Z', now)).toBe('now')
    expect(timeAgo('2026-10-12T11:30:00Z', now)).toBe('30m')
    expect(timeAgo('2026-10-12T05:00:00Z', now)).toBe('7h')
    expect(timeAgo('2026-10-09T12:00:00Z', now)).toBe('3d')
  })

  it('falls back to month-day, adding the year only for older years', () => {
    expect(timeAgo('2026-09-14T00:00:00Z', now)).toBe('Sep 14')
    expect(timeAgo('2025-12-01T00:00:00Z', now)).toBe('Dec 1, 2025')
  })

  it('returns empty for invalid dates', () => {
    expect(timeAgo('not-a-date', now)).toBe('')
  })
})
