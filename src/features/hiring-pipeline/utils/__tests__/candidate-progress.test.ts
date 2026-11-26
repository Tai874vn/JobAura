import { describe, expect, it } from 'vitest'
import { candidateDialogAllowed, furthestStep, needsAction, nextBooked, trackerView } from '../candidate-progress'

const ev = (type: string, data: Record<string, unknown> | null = null) => ({ id: 1, type, data, createdAt: '2026-11-12T10:00:00' })
const states = (view: ReturnType<typeof trackerView>) => view.steps.map((s) => s.state)

describe('trackerView', () => {
  it('marks steps before the current one done, and the current one current', () => {
    const view = trackerView({ status: 'INTERVIEWING', events: [] })
    expect(view.steps.map((s) => s.label)).toEqual(['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired'])
    expect(states(view)).toEqual(['done', 'done', 'current', 'todo', 'todo'])
    expect(view.line).toBeNull()
  })

  it('has Applied as the current step for a new application', () => {
    expect(states(trackerView({ status: 'APPLIED', events: [] }))).toEqual(['current', 'todo', 'todo', 'todo', 'todo'])
  })

  it('shows an offer as the current step', () => {
    expect(states(trackerView({ status: 'OFFERED', events: [] }))).toEqual(['done', 'done', 'done', 'current', 'todo'])
  })

  it('shows Hired all green with a happy line', () => {
    const view = trackerView({ status: 'HIRED', events: [] })
    expect(states(view)).toEqual(['done', 'done', 'done', 'done', 'done'])
    expect(view.line).toMatch(/hired/i)
    expect(view.tone).toBe('good')
  })

  it('shows how far a not-selected application got, greyed', () => {
    const view = trackerView({ status: 'REJECTED', events: [ev('applied'), ev('shortlisted'), ev('interview_requested'), ev('rejected')] })
    expect(states(view)).toEqual(['stopped', 'stopped', 'stopped', 'todo', 'todo'])
  })

  it('says "Position filled" and "Post closed" under Not selected', () => {
    expect(trackerView({ status: 'REJECTED', statusReason: 'POSITION_FILLED', events: [] }).line).toBe('Not selected · Position filled')
    expect(trackerView({ status: 'REJECTED', statusReason: 'POST_CLOSED', events: [] }).line).toBe('Not selected · Post closed')
  })

  it('shows the recruiter note when a person rejected', () => {
    expect(trackerView({ status: 'REJECTED', statusNote: 'We chose someone with more years.', events: [] }).line).toBe(
      'Not selected · We chose someone with more years.',
    )
    expect(trackerView({ status: 'REJECTED', events: [] }).line).toBe('Not selected')
  })

  it('keeps a declined offer at the Offer step', () => {
    const view = trackerView({ status: 'DECLINED', events: [ev('applied'), ev('offer_sent')] })
    expect(states(view)).toEqual(['stopped', 'stopped', 'stopped', 'stopped', 'todo'])
    expect(view.line).toBe('Offer declined')
  })

  it('shows a withdrawn application with its furthest step', () => {
    const view = trackerView({ status: 'WITHDRAWN', events: [ev('applied'), ev('shortlisted'), ev('withdrawn')] })
    expect(states(view)).toEqual(['stopped', 'stopped', 'todo', 'todo', 'todo'])
    expect(view.line).toBe('You withdrew this application.')
  })

  it('only has the first step when a stopped row has no history', () => {
    expect(states(trackerView({ status: 'WITHDRAWN', events: [] }))).toEqual(['stopped', 'todo', 'todo', 'todo', 'todo'])
  })
})

describe('furthestStep', () => {
  it('reads the furthest step from the history', () => {
    expect(furthestStep([ev('applied')])).toBe(0)
    expect(furthestStep([ev('applied'), ev('shortlisted')])).toBe(1)
    expect(furthestStep([ev('shortlisted'), ev('interview_requested')])).toBe(2)
    expect(furthestStep([ev('interview_requested'), ev('offer_sent'), ev('offer_declined')])).toBe(3)
  })
})

const iv = (status: string, extra: Record<string, unknown> = {}) =>
  ({ id: 1, round: 1, mode: 'ONLINE', durationMinutes: 45, proposedTimes: [], status, ...extra }) as never

describe('needsAction', () => {
  it('is true for an offer, and for an interview waiting for a time', () => {
    expect(needsAction({ status: 'OFFERED', interviews: [] })).toBe(true)
    expect(needsAction({ status: 'INTERVIEWING', interviews: [iv('PROPOSED')] })).toBe(true)
  })
  it('is false otherwise', () => {
    expect(needsAction({ status: 'INTERVIEWING', interviews: [iv('SCHEDULED')] })).toBe(false)
    expect(needsAction({ status: 'REJECTED', interviews: [iv('PROPOSED')] })).toBe(false)
    expect(needsAction({ status: 'APPLIED', interviews: [] })).toBe(false)
  })
})

describe('nextBooked', () => {
  it('gives the booked time of a scheduled interview', () => {
    expect(nextBooked([iv('COMPLETED', { scheduledAt: '2026-11-01T03:00:00Z' }), iv('SCHEDULED', { scheduledAt: '2026-11-25T03:00:00Z' })])).toBe('2026-11-25T03:00:00Z')
    expect(nextBooked([iv('PROPOSED')])).toBeNull()
  })
})

describe('candidateDialogAllowed', () => {
  it('allows accept and decline only while the offer stands', () => {
    expect(candidateDialogAllowed('accept', 'OFFERED')).toBe(true)
    expect(candidateDialogAllowed('decline', 'OFFERED')).toBe(true)
    expect(candidateDialogAllowed('accept', 'INTERVIEWING')).toBe(false)
    expect(candidateDialogAllowed('decline', 'HIRED')).toBe(false)
  })
  it('allows withdraw while the application is in progress', () => {
    for (const s of ['APPLIED', 'REVIEWING', 'INTERVIEWING', 'OFFERED'] as const) expect(candidateDialogAllowed('withdraw', s)).toBe(true)
    for (const s of ['HIRED', 'REJECTED', 'DECLINED', 'WITHDRAWN'] as const) expect(candidateDialogAllowed('withdraw', s)).toBe(false)
  })
})
