import { describe, expect, it } from 'vitest'
import { formatDate as formatHiringDate } from '@/features/hiring/components/browse/hiring-post-card'
import { formatDate, formatFullDate } from '../utils/profile/model'

// 20:00 UTC on Nov 24 is already Nov 25 in Vietnam (UTC+7). Server and browser must print the same day,
// otherwise React reports a hydration mismatch (error #418), as the bot found on /profile/576.
const lateEvening = '2026-11-24T20:00:00.000Z'

describe('dates render the same on server and browser', () => {
  it('profile dates use UTC whatever the local time zone is', () => {
    expect(formatFullDate(lateEvening)).toBe('Nov 24, 2026')
    expect(formatDate('2026-11-30T23:30:00.000Z')).toBe('Nov 2026')
  })

  it('hiring post dates use UTC', () => {
    expect(formatHiringDate(lateEvening)).toBe('Nov 24, 2026')
  })
})
