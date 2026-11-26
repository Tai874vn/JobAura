import { describe, expect, it } from 'vitest'
import type { ApplicationDetail } from '@/shared/schemas'
import { applicantActions, dialogStillAllowed, noOpeningsLeft, openingsLeft, outcomeWanted } from './applicant-actions'

type Iv = ApplicationDetail['interviews'][number]['status']
const app = (status: ApplicationDetail['status'], interviews: Iv[] = [], post: Record<string, unknown> = {}) =>
  ({
    status,
    interviews: interviews.map((s, i) => ({ id: i + 1, round: i + 1, status: s })),
    hiringPost: { openings: 2, hiredCount: 0, offersWaiting: 0, ...post },
  }) as unknown as ApplicationDetail

describe('applicantActions', () => {
  it('lets a new application be shortlisted, get an interview, or be rejected', () => {
    expect(applicantActions(app('APPLIED'))).toEqual(['shortlist', 'requestInterview', 'reject', 'message'])
  })

  it('does not offer "shortlist" again once shortlisted', () => {
    expect(applicantActions(app('REVIEWING'))).toEqual(['requestInterview', 'reject', 'message'])
  })

  it('only allows reject while an interview is still going on', () => {
    for (const active of ['PROPOSED', 'RESCHEDULE_REQUESTED', 'SCHEDULED'] as const) {
      expect(applicantActions(app('INTERVIEWING', [active]))).toEqual(['reject', 'message'])
    }
  })

  it('asks for an interview when none is going on and none is done (the first was cancelled)', () => {
    expect(applicantActions(app('INTERVIEWING', ['CANCELLED']))).toEqual(['requestInterview', 'reject', 'message'])
    expect(applicantActions(app('INTERVIEWING'))).toEqual(['requestInterview', 'reject', 'message'])
  })

  it('allows an offer or another round after an interview is done', () => {
    expect(applicantActions(app('INTERVIEWING', ['COMPLETED']))).toEqual(['offer', 'nextRound', 'reject', 'message'])
  })

  it('hides the offer when no openings are left, but keeps the other steps', () => {
    const full = app('INTERVIEWING', ['COMPLETED'], { openings: 2, hiredCount: 1, offersWaiting: 1 })
    expect(applicantActions(full)).toEqual(['nextRound', 'reject', 'message'])
    expect(noOpeningsLeft(full)).toBe(true)
  })

  it('counts a post without a limit as always having room', () => {
    const open = app('INTERVIEWING', ['COMPLETED'], { openings: null, hiredCount: 9, offersWaiting: 3 })
    expect(openingsLeft(open.hiringPost)).toBeNull()
    expect(applicantActions(open)).toContain('offer')
    expect(noOpeningsLeft(open)).toBe(false)
  })

  it('only says "no openings" where an offer could otherwise be sent', () => {
    const full = { openings: 1, hiredCount: 1, offersWaiting: 0 }
    expect(noOpeningsLeft(app('APPLIED', [], full))).toBe(false)
    expect(noOpeningsLeft(app('INTERVIEWING', ['SCHEDULED'], full))).toBe(false)
  })

  it('lets a waiting offer be withdrawn', () => {
    expect(applicantActions(app('OFFERED', ['COMPLETED']))).toEqual(['withdrawOffer', 'message'])
  })

  it('has no step for a finished application, only Message', () => {
    for (const done of ['HIRED', 'REJECTED', 'DECLINED', 'WITHDRAWN'] as const) {
      expect(applicantActions(app(done))).toEqual(['message'])
    }
  })

  it('reads the openings left from the post numbers', () => {
    expect(openingsLeft({ openings: 3, hiredCount: 1, offersWaiting: 1 })).toBe(1)
    expect(openingsLeft({ openings: 1, hiredCount: 1, offersWaiting: 1 })).toBe(-1)
    expect(openingsLeft(undefined)).toBeNull()
  })
})

describe('dialogStillAllowed', () => {
  it('keeps a dialog open while its step is allowed', () => {
    expect(dialogStillAllowed('reject', app('REVIEWING'))).toBe(true)
    expect(dialogStillAllowed('offer', app('INTERVIEWING', ['COMPLETED']))).toBe(true)
    expect(dialogStillAllowed('withdraw-offer', app('OFFERED'))).toBe(true)
    expect(dialogStillAllowed('request', app('INTERVIEWING', ['COMPLETED']))).toBe(true)
  })

  it('closes it once the application moved on (the candidate withdrew)', () => {
    expect(dialogStillAllowed('reject', app('WITHDRAWN'))).toBe(false)
    expect(dialogStillAllowed('offer', app('WITHDRAWN', ['COMPLETED']))).toBe(false)
    expect(dialogStillAllowed('withdraw-offer', app('HIRED'))).toBe(false)
    expect(dialogStillAllowed('request', app('INTERVIEWING', ['SCHEDULED']))).toBe(false)
  })

  it('closes the offer dialog when the last opening was taken meanwhile', () => {
    expect(dialogStillAllowed('offer', app('INTERVIEWING', ['COMPLETED'], { openings: 1, hiredCount: 1 }))).toBe(false)
  })
})

describe('outcomeWanted', () => {
  it('asks "How did it go?" only after a finished interview with none going on', () => {
    expect(outcomeWanted(app('INTERVIEWING', ['COMPLETED']))).toBe(true)
    expect(outcomeWanted(app('INTERVIEWING', ['SCHEDULED']))).toBe(false)
    expect(outcomeWanted(app('INTERVIEWING', ['COMPLETED', 'PROPOSED']))).toBe(false)
    expect(outcomeWanted(app('OFFERED', ['COMPLETED']))).toBe(false)
    expect(outcomeWanted(app('INTERVIEWING'))).toBe(false)
  })
})
