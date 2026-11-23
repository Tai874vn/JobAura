import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Interview } from '@/shared/schemas'
import { InterviewCard, interviewDialogAllowed, PickErrorLine, routePickError } from './interview-card'

const base = {
  id: 5, round: 1, mode: 'ONLINE', durationMinutes: 45, location: null, note: 'Bring your portfolio',
  proposedTimes: ['2099-11-25T03:00:00.000Z', '2099-11-26T03:00:00.000Z'], scheduledAt: null, status: 'PROPOSED',
  rescheduleNote: null, completedAt: null, cancelledAt: null,
} as Interview
const scheduled = { ...base, status: 'SCHEDULED', scheduledAt: '2099-11-25T03:00:00.000Z' } as Interview
const card = (interview: Interview, viewer: 'recruiter' | 'candidate') =>
  renderToStaticMarkup(<InterviewCard interview={interview} viewer={viewer} onAction={() => undefined} />)

describe('InterviewCard', () => {
  it('shows "Pick this time" for each proposed time to the candidate', () => {
    const html = card(base, 'candidate')
    expect(html.match(/Pick this time/g)).toHaveLength(2)
    expect(html).toContain('Online on JobAura')
    expect(html).toContain('45 min')
    expect(html).toContain('Bring your portfolio')
  })

  it('does not show "Pick this time" to the recruiter', () => {
    expect(card(base, 'recruiter')).not.toContain('Pick this time')
  })

  it('shows "Join call" linking to the call page for a scheduled online interview', () => {
    const html = card(scheduled, 'candidate')
    expect(html).toContain('Join call')
    expect(html).toContain('href="/interviews/5/call"')
    expect(html).not.toContain('Skip')
  })

  it('gives the recruiter a plain "Skip" button on a scheduled online interview', () => {
    const html = card(scheduled, 'recruiter')
    expect(html).toMatch(/<button[^>]*>Skip<\/button>/)
    expect(html).not.toMatch(/<button[^>]*(title|aria-label)=[^>]*>Skip/)
  })

  it('shows the address and no Join call for an onsite interview', () => {
    const html = card({ ...scheduled, mode: 'ONSITE', location: '12 Le Loi' }, 'candidate')
    expect(html).toContain('12 Le Loi')
    expect(html).not.toContain('Join call')
  })

  it('disables a proposed time that has already passed', () => {
    const html = card({ ...base, proposedTimes: ['2000-01-01T03:00:00.000Z', '2099-11-26T03:00:00.000Z'] }, 'candidate')
    expect(html.match(/Pick this time/g)).toHaveLength(1)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Passed<\/button>/)
  })
})

describe('interviewDialogAllowed', () => {
  it('keeps each dialog while its step is still possible', () => {
    expect(interviewDialogAllowed('cancel', 'SCHEDULED')).toBe(true)
    expect(interviewDialogAllowed('other-times', 'PROPOSED')).toBe(true)
    expect(interviewDialogAllowed('new-times', 'RESCHEDULE_REQUESTED')).toBe(true)
  })

  it('closes them once the interview moved on', () => {
    expect(interviewDialogAllowed('cancel', 'CANCELLED')).toBe(false)
    expect(interviewDialogAllowed('cancel', 'COMPLETED')).toBe(false)
    expect(interviewDialogAllowed('other-times', 'SCHEDULED')).toBe(false)
    expect(interviewDialogAllowed('new-times', 'SCHEDULED')).toBe(false)
    expect(interviewDialogAllowed('new-times', 'CANCELLED')).toBe(false)
  })
})

describe('PickErrorLine', () => {
  it('shows the server sentence as an alert, and nothing when there is none', () => {
    const html = renderToStaticMarkup(<PickErrorLine message="That time has already passed." />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('That time has already passed.')
    expect(renderToStaticMarkup(<PickErrorLine message={null} />)).toBe('')
  })
})

describe('routePickError', () => {
  it('tells the sentence under the times while the interview waits for a time', () => {
    expect(routePickError('Too late.', 'PROPOSED')).toBe('inline')
  })
  it('sends it to the panel once the interview moved on', () => {
    for (const status of ['CANCELLED', 'SCHEDULED', 'COMPLETED', 'RESCHEDULE_REQUESTED'] as const) expect(routePickError('Gone.', status)).toBe('notice')
  })
  it('has nothing to route without a sentence', () => {
    expect(routePickError(null, 'CANCELLED')).toBe('none')
  })
})
