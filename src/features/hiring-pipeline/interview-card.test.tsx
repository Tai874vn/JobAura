import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Interview } from '@/shared/schemas'
import { InterviewCard } from './interview-card'

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
})
