import { describe, expect, it } from 'vitest'
import { validateInterviewRequest, type InterviewDraft } from '../request-interview-validation'

const now = new Date(2026, 10, 23, 12, 0)
const draft = (change: Partial<InterviewDraft> = {}): InterviewDraft => ({
  mode: 'ONLINE',
  times: ['2026-11-25T10:00'],
  durationMinutes: 45,
  location: '',
  note: '',
  ...change,
})

describe('validateInterviewRequest', () => {
  it('turns local times into ISO UTC and leaves out an empty address and note', () => {
    expect(validateInterviewRequest(draft(), now)).toEqual({
      request: { mode: 'ONLINE', proposedTimes: [new Date(2026, 10, 25, 10, 0).toISOString()], durationMinutes: 45 },
    })
  })

  it('sends the trimmed address for ONSITE and the trimmed note', () => {
    const result = validateInterviewRequest(draft({ mode: 'ONSITE', location: ' 12 Le Loi ', note: ' Bring ID ' }), now)
    expect(result).toMatchObject({ request: { mode: 'ONSITE', location: '12 Le Loi', note: 'Bring ID' } })
  })

  it('needs an address for ONSITE and names the field', () => {
    expect(validateInterviewRequest(draft({ mode: 'ONSITE' }), now)).toEqual({ error: 'Address is needed for an onsite interview.' })
  })

  it('does not send an address for ONLINE', () => {
    const result = validateInterviewRequest(draft({ location: 'old text' }), now)
    expect('request' in result && result.request.location).toBeUndefined()
  })

  it('refuses a time in the past', () => {
    expect(validateInterviewRequest(draft({ times: ['2026-11-20T10:00'] }), now)).toEqual({ error: 'Time 1 must be in the future.' })
  })

  it('refuses an empty time row', () => {
    expect(validateInterviewRequest(draft({ times: ['2026-11-25T10:00', ''] }), now)).toEqual({ error: 'Time 2: pick a date and a time.' })
  })

  it('refuses two times that are the same', () => {
    expect(validateInterviewRequest(draft({ times: ['2026-11-25T10:00', '2026-11-25T10:00'] }), now)).toEqual({
      error: 'Times must all be different.',
    })
  })

  it('allows 1 to 3 times only', () => {
    expect(validateInterviewRequest(draft({ times: [] }), now)).toEqual({ error: 'Add 1 to 3 times.' })
    const four = ['2026-11-25T10:00', '2026-11-25T11:00', '2026-11-25T12:00', '2026-11-25T13:00']
    expect(validateInterviewRequest(draft({ times: four }), now)).toEqual({ error: 'Add 1 to 3 times.' })
  })

  it('skips the mode and address checks when only new times are sent', () => {
    const result = validateInterviewRequest(draft({ mode: 'ONSITE' }), now, { timesOnly: true })
    expect(result).toMatchObject({ request: { proposedTimes: expect.any(Array) } })
  })
})
