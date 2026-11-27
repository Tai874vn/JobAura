import { describe, expect, it } from 'vitest'
import { matchingButtonLabel } from '../matching-action-card'

const quota = (remaining: number) => ({ remaining, limit: 5 }) as never

describe('matchingButtonLabel', () => {
  it('asks for a hiring post when none is selected, even with AI uses left', () => {
    expect(matchingButtonLabel({ canRun: false, hasResults: false, hasHiringPost: false, quota: quota(5), loadingQuota: false }))
      .toBe('Choose a hiring post first')
  })

  it('says no AI uses are left only when the quota is spent', () => {
    expect(matchingButtonLabel({ canRun: false, hasResults: false, hasHiringPost: true, quota: quota(0), loadingQuota: false }))
      .toBe('No AI uses left')
  })

  it('offers to run or run again when it can', () => {
    expect(matchingButtonLabel({ canRun: true, hasResults: false, hasHiringPost: true, quota: quota(5), loadingQuota: false })).toBe('Proceed to match')
    expect(matchingButtonLabel({ canRun: true, hasResults: true, hasHiringPost: true, quota: quota(4), loadingQuota: false })).toBe('Run again')
  })

  it('offers Try again instead of No AI uses left when quota failed to load', () => {
    expect(matchingButtonLabel({ canRun: false, hasResults: false, hasHiringPost: true, quota: undefined, loadingQuota: false, quotaError: true }))
      .toBe('Try again')
  })
})
