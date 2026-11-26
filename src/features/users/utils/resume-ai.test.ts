import { describe, expect, it } from 'vitest'
import { canRetryResumeAi, isResumeAiPending, resumeAiStatus, suggestedSkills, unrecognisedSkills } from './resume-ai'

const resume = (change: Record<string, unknown>) => ({ data: {}, ...change })

describe('resume AI queue state', () => {
  it('reads the queue status the backend stores', () => {
    expect(resumeAiStatus(null)).toBeNull()
    expect(resumeAiStatus(resume({ aiStatus: 'weird' }))).toBeNull()
    expect(isResumeAiPending(resume({ aiStatus: 'QUEUED' }))).toBe(true)
    expect(isResumeAiPending(resume({ aiStatus: 'PROCESSING' }))).toBe(true)
    expect(isResumeAiPending(resume({ aiStatus: 'DONE' }))).toBe(false)
    expect(canRetryResumeAi(resume({ aiStatus: 'AI_UNAVAILABLE' }))).toBe(true)
    expect(canRetryResumeAi(resume({ aiStatus: 'FAILED' }))).toBe(true)
    expect(canRetryResumeAi(resume({ aiStatus: 'NEEDS_INPUT' }))).toBe(false)
  })

  it('reads suggested and unrecognised skills defensively', () => {
    const value = resume({ aiInsights: {
      suggestedSkills: [{ id: 'onet:docker', name: 'Docker' }, { name: 'no id' }, null],
      unrecognisedSkills: ['Reakt', 3],
    } })
    expect(suggestedSkills(value)).toEqual([{ id: 'onet:docker', name: 'Docker', matched: [] }])
    expect(unrecognisedSkills(value)).toEqual(['Reakt'])
    expect(suggestedSkills(resume({}))).toEqual([])
  })
})
