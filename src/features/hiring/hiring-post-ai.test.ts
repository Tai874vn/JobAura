import { describe, expect, it } from 'vitest'
import { hiringPostAiState, isHiringPostAiPending } from './hiring-post-ai'

const post = (aiStatus: string | null, extra: Record<string, unknown> = {}) =>
  ({ aiStatus, aiStatusMessage: null, predictedSeniority: null, ...extra }) as Parameters<typeof hiringPostAiState>[0]

describe('hiring post AI state', () => {
  it('is pending while queued or being worked on', () => {
    expect(isHiringPostAiPending(post('QUEUED'))).toBe(true)
    expect(isHiringPostAiPending(post('PROCESSING'))).toBe(true)
    expect(hiringPostAiState(post('QUEUED')).label).toMatch(/Working out/)
  })

  it('offers Try again with the reason when the AI was unavailable or failed', () => {
    const state = hiringPostAiState(post('AI_UNAVAILABLE', { aiStatusMessage: 'The AI service is unavailable right now.' }))
    expect(state).toEqual({ label: null, message: 'The AI service is unavailable right now.', action: 'Try again' })
    expect(hiringPostAiState(post('FAILED')).action).toBe('Try again')
    expect(
      hiringPostAiState(post('FAILED', { aiStatusMessage: 'PrismaClientKnownRequestError at https://ai.local/predict' })),
    ).toEqual({ label: null, message: 'The AI level could not be worked out.', action: 'Try again' })
  })

  it('asks for the missing input without a button', () => {
    expect(hiringPostAiState(post('NEEDS_INPUT')).action).toBeNull()
  })

  it('offers to get a level only when the post has none', () => {
    expect(hiringPostAiState(post(null)).action).toBe('Get AI level')
    expect(hiringPostAiState(post('DONE', { predictedSeniority: 'Mid' })).action).toBeNull()
  })
})
