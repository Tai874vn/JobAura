import { describe, expect, it } from 'vitest'
import type { HiringPost } from '@/shared/schemas'
import { activeApplicationCount, closePostQuestion, pipelineSummary } from '../hiring-pipeline-summary'

const counts = (c: Partial<Record<'APPLIED' | 'REVIEWING' | 'INTERVIEWING' | 'OFFERED' | 'HIRED', number>> = {}) =>
  ({ APPLIED: 0, REVIEWING: 0, INTERVIEWING: 0, OFFERED: 0, HIRED: 0, ...c })
const post = (change: Partial<HiringPost>): Pick<HiringPost, 'openings' | 'hiredCount' | 'pipeline'> => ({
  openings: 2, hiredCount: 0, pipeline: counts(), ...change,
})

describe('pipelineSummary', () => {
  it('reads "3 new · 1 interview · 1 offer · 1 of 2 filled"', () => {
    const text = pipelineSummary(post({ pipeline: counts({ APPLIED: 3, INTERVIEWING: 1, OFFERED: 1, HIRED: 1 }), hiredCount: 1 }))
    expect(text).toBe('3 new · 1 interview · 1 offer · 1 of 2 filled')
  })

  it('adds the shortlisted step and leaves out zero parts', () => {
    expect(pipelineSummary(post({ pipeline: counts({ REVIEWING: 2 }), hiredCount: 0 }))).toBe('2 shortlisted · 0 of 2 filled')
    expect(pipelineSummary(post({ pipeline: counts({ INTERVIEWING: 4, OFFERED: 2 }) }))).toBe('4 interviews · 2 offers · 0 of 2 filled')
  })

  it('shows "<n> hired" when there is no limit, and nothing for zero hired', () => {
    expect(pipelineSummary(post({ openings: null, pipeline: counts({ APPLIED: 1, HIRED: 3 }), hiredCount: 3 }))).toBe('1 new · 3 hired')
    expect(pipelineSummary(post({ openings: null }))).toBe('')
  })

  it('is empty without pipeline numbers (not the owner)', () => {
    expect(pipelineSummary({ openings: 2, hiredCount: 0 })).toBe('')
  })

  it('takes hired from the pipeline when hiredCount is missing', () => {
    expect(pipelineSummary({ openings: 3, pipeline: counts({ HIRED: 2 }) })).toBe('2 of 3 filled')
  })
})

describe('activeApplicationCount', () => {
  it('adds the 4 active steps, not HIRED', () => {
    expect(activeApplicationCount(counts({ APPLIED: 2, REVIEWING: 1, INTERVIEWING: 1, OFFERED: 1, HIRED: 9 }))).toBe(5)
    expect(activeApplicationCount(undefined)).toBe(0)
  })
})

describe('closePostQuestion', () => {
  it('names how many people are still in progress', () => {
    expect(closePostQuestion(5)).toBe('Close this post? 5 people still in progress will be told it is closed.')
    expect(closePostQuestion(1)).toBe('Close this post? 1 person still in progress will be told it is closed.')
    expect(closePostQuestion(0)).toBe('Close this post?')
  })
})
