import { describe, expect, it } from 'vitest'
import type { AppNotification } from '@/shared/schemas'
import {
  notificationContext,
  notificationDetail,
  notificationHeadline,
  notificationTarget,
  roomIdFromNotification,
  safeInternalActionUrl,
} from '../notification-display'

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 1,
    recipientId: 10,
    type: 'CHAT_MESSAGE',
    title: 'New message',
    body: 'Hello',
    readAt: null,
    createdAt: '2026-08-22T00:00:00.000Z',
    metadata: {},
    ...overrides,
  }
}

describe('notification display model', () => {
  it('accepts only internal action URLs', () => {
    expect(safeInternalActionUrl('/jobs/1?tab=details')).toBe('/jobs/1?tab=details')
    expect(safeInternalActionUrl('//evil.example/path')).toBeNull()
    expect(safeInternalActionUrl('/\\evil.example/path')).toBeNull()
    expect(safeInternalActionUrl('https://evil.example/path')).toBeNull()
  })

  it('reads numeric room identifiers from notification metadata', () => {
    expect(roomIdFromNotification(notification({ metadata: { roomId: '42' } }))).toBe(42)
    expect(roomIdFromNotification(notification({ metadata: { roomId: 'invalid' } }))).toBeNull()
  })

  it('builds an unread chat headline from actor and count', () => {
    expect(notificationHeadline(notification({
      actor: { id: 2, name: 'Alex' },
      metadata: { unreadCount: 3 },
    }))).toBe('3 new messages from Alex')
  })

  describe('hiring pipeline notifications', () => {
    const pipeline = (overrides: Partial<AppNotification>) => notification({
      metadata: { applicationId: 9, postId: 4 },
      actionUrl: '/my-hiring-posts/4/applicants?application=9',
      ...overrides,
    })

    it('says who applied for which post, read or not', () => {
      const received = pipeline({
        type: 'APPLICATION_RECEIVED', title: 'New applicant', body: 'Hai Vu applied for Senior Test Engineer.',
        actor: { id: 5, name: 'Hai Vu' },
        metadata: { applicationId: 9, postId: 4, postTitle: 'Senior Test Engineer', actorName: 'Hai Vu', kind: 'received' },
      })
      expect(notificationHeadline(received)).toBe('Hai Vu applied for Senior Test Engineer')
      expect(notificationHeadline({ ...received, readAt: '2026-11-23T00:00:00.000Z' })).toBe('Hai Vu applied for Senior Test Engineer')
      expect(notificationContext(received)).toBe('Applicant')
      // The headline already says it all, so the body is not repeated.
      expect(notificationDetail(received)).toBeNull()
    })

    it('falls back to the server title for an older notification without the new fields', () => {
      const old = pipeline({ type: 'APPLICATION_RECEIVED', title: 'New applicant', body: 'Hai Vu applied for Senior Test Engineer.', actor: { id: 5, name: 'Hai Vu' } })
      expect(notificationHeadline(old)).toBe('New applicant')
      expect(notificationDetail(old)).toBe('Hai Vu applied for Senior Test Engineer.')
    })

    it('uses the title of an application update, with the body as detail', () => {
      const update = pipeline({
        type: 'APPLICATION_UPDATE', title: 'Offer accepted', body: 'Hai Vu accepted the offer for Senior Test Engineer.',
        actor: { id: 5, name: 'Hai Vu' },
      })
      expect(notificationHeadline(update)).toBe('Offer accepted')
      expect(notificationContext(update)).toBe('Application')
      expect(notificationDetail(update)).toBe('Hai Vu accepted the offer for Senior Test Engineer.')
    })

    it('names the booked time in the viewer own time zone when the payload carries it', () => {
      const booked = pipeline({
        type: 'INTERVIEW_UPDATE', title: 'Interview booked', body: 'Hai Vu picked Tue 25 Nov 03:00 (Vietnam time) for the Senior Test Engineer interview.',
        metadata: { applicationId: 9, postId: 4, postTitle: 'Senior Test Engineer', actorName: 'Hai Vu', kind: 'interview', scheduledAt: new Date(2026, 10, 25, 10, 0).toISOString() },
      })
      expect(notificationHeadline(booked)).toBe('Interview booked for Wed 25 Nov, 10:00')
      expect(notificationContext(booked)).toBe('Interview')
    })

    it('keeps the title when no time is in the payload or it is not a date', () => {
      expect(notificationHeadline(pipeline({ type: 'INTERVIEW_UPDATE', title: 'Interview booked', body: 'x' }))).toBe('Interview booked')
      expect(notificationHeadline(pipeline({ type: 'INTERVIEW_UPDATE', title: 'Interview booked', body: 'x', metadata: { kind: 'interview', scheduledAt: 'soon' } }))).toBe('Interview booked')
      // New times or a request carry proposedTimes, not scheduledAt: the server title stays.
      expect(notificationHeadline(pipeline({ type: 'INTERVIEW_UPDATE', title: 'Interview request', body: 'x', metadata: { kind: 'interview', proposedTimes: [new Date().toISOString()] } }))).toBe('Interview request')
    })
  })

  describe('proposal and contract notifications', () => {
    const isProposalStep = (step: string) => step.startsWith('proposal_') && step !== 'proposal_accepted'
    const contract = (step: string, extra: Record<string, unknown> = {}, overrides: Partial<AppNotification> = {}) => notification({
      type: isProposalStep(step) ? 'PROPOSAL_UPDATE' : 'CONTRACT_UPDATE',
      title: 'Server title',
      body: 'Server body.',
      actor: { id: 5, name: 'Hai Vu' },
      metadata: { kind: isProposalStep(step) ? 'proposal' : 'contract', step, proposalId: null, contractId: null, milestoneId: null, actorName: 'Hai Vu', title: 'Counter-offer', jobTitle: 'Logo design', ...extra },
      ...overrides,
    })

    it.each([
      ['proposal_sent', 'Hai Vu sent you a proposal'],
      ['proposal_countered', 'New version of the proposal for Logo design'],
      ['proposal_declined', 'Hai Vu declined the proposal for Logo design'],
      ['proposal_withdrawn', 'Hai Vu withdrew the proposal for Logo design'],
      ['proposal_expired', 'The proposal for Logo design expired'],
      ['proposal_accepted', 'Hai Vu accepted the proposal for Logo design'],
      ['milestone_funded', 'Milestone funded'],
      ['work_submitted', 'Work submitted'],
      ['changes_requested', 'Changes requested'],
      ['milestone_approved', 'Milestone approved'],
      ['contract_completed', 'Contract completed'],
      ['contract_ended', 'Contract ended'],
    ])('writes the headline for %s', (step, expected) => {
      expect(notificationHeadline(contract(step))).toBe(expected)
    })

    it('adds the milestone number and amount when the server sends them', () => {
      expect(notificationHeadline(contract('milestone_funded', { position: 2 }))).toBe('Milestone 2 funded')
      expect(notificationHeadline(contract('work_submitted', { position: 1 }))).toBe('Work submitted for milestone 1')
      expect(notificationHeadline(contract('changes_requested', { position: 1 }))).toBe('Changes requested on milestone 1')
      expect(notificationHeadline(contract('milestone_approved', { position: 1, amount: 300 }))).toBe('Milestone 1 approved · 300 credits released')
      expect(notificationHeadline(contract('warning_sent', { position: 2, rule: 'freelancer_late' }))).toBe('Milestone 2 is past its due date')
      expect(notificationHeadline(contract('warning_sent', { position: 2, rule: 'client_silent' }))).toBe('Milestone 2 is waiting for a review')
      expect(notificationHeadline(contract('warning_sent', { position: 3, rule: 'not_funded' }))).toBe('Milestone 3 is not funded yet')
      expect(notificationHeadline(contract('warning_sent', { position: null, rule: 'freelancer_late' }))).toBe('A milestone is past its due date')
      expect(notificationHeadline(contract('warning_sent', { rule: null }))).toBe('Server title')
    })

    it('keeps the headline once read, and falls back to the server title', () => {
      // Old rows have no jobTitle: the headline just leaves the service name out.
      expect(notificationHeadline(contract('proposal_countered', { jobTitle: undefined }))).toBe('New version of the proposal')
      expect(notificationHeadline(contract('proposal_expired', { jobTitle: undefined }))).toBe('The proposal expired')
      expect(notificationHeadline(contract('proposal_sent', {}, { readAt: '2026-11-24T00:00:00.000Z' }))).toBe('Hai Vu sent you a proposal')
      expect(notificationHeadline(contract('some_new_step'))).toBe('Server title')
      expect(notificationHeadline(notification({ type: 'CONTRACT_UPDATE', title: 'Old title', metadata: {} }))).toBe('Old title')
    })

    it('names the context and shows the server body as detail', () => {
      expect(notificationContext(contract('proposal_sent'))).toBe('Proposal')
      expect(notificationContext(contract('milestone_funded'))).toBe('Contract')
      expect(notificationDetail(contract('milestone_funded'))).toBe('Server body.')
    })

    it('old hire notifications still read sensibly and open the contracts page', () => {
      const hire = notification({ type: 'HIRE_CREATED', title: 'New hire', actor: { id: 5, name: 'Hai Vu' }, actionUrl: '/my-jobs' })
      expect(notificationHeadline(hire)).toBe('Hai Vu created a hire update')
      expect(notificationContext(hire)).toBe('Hiring')
      expect(notificationTarget(hire)).toBe('/contracts')
      expect(notificationTarget({ ...hire, type: 'HIRE_COMPLETED', actionUrl: null })).toBe('/contracts')
    })

    it('opens the action URL, or builds the contracts link from the metadata', () => {
      expect(notificationTarget(contract('proposal_sent', {}, { actionUrl: '/contracts?tab=freelancer&proposal=7' }))).toBe('/contracts?tab=freelancer&proposal=7')
      expect(notificationTarget(contract('proposal_sent', { proposalId: 7 }, { actionUrl: 'https://evil.example/x' }))).toBe('/contracts?proposal=7')
      expect(notificationTarget(contract('milestone_funded', { contractId: 3 }, { actionUrl: null }))).toBe('/contracts?contract=3')
      expect(notificationTarget(contract('proposal_accepted', { proposalId: 7, contractId: 3 }, { actionUrl: null }))).toBe('/contracts?contract=3')
      expect(notificationTarget(notification({ type: 'POST_LIKE', actionUrl: '/?postId=4' }))).toBe('/?postId=4')
    })
  })
})
