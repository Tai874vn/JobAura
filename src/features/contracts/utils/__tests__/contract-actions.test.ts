import { describe, expect, it } from 'vitest'
import type { MilestoneView } from '@/shared/schemas'
import { contractActions, currentMilestone, dialogStillAllowed, milestoneClock, timeSpan } from '../contract-actions'
import { CLIENT, FREELANCER, contractOf, milestoneOf } from '../contract-test-data'

const ADMIN = 99

const amendment = (proposerId: number) => ({
  id: 3, status: 'OPEN' as const, proposerId, note: null, deadline: null, changes: [], declineNote: null, createdAt: '2030-01-02T00:00:00.000Z', decidedAt: null,
})
const endRequest = (byUserId: number, choice: 'APPROVE' | 'REFUND' | null = null, requestedAt = '2030-01-05T00:00:00.000Z') => ({
  byUserId, note: null, choice, requestedAt,
})

describe('contractActions for the current milestone', () => {
  const held = (status: MilestoneView['status']) => (['FUNDED', 'SUBMITTED', 'CHANGES_REQUESTED'].includes(status) ? 500 : 0)
  const table: [MilestoneView['status'], 'client' | 'freelancer', string[]][] = [
    ['PENDING', 'client', ['fund']],
    ['PENDING', 'freelancer', []],
    ['FUNDED', 'client', []],
    ['FUNDED', 'freelancer', ['submit']],
    ['SUBMITTED', 'client', ['requestChanges', 'approve']],
    ['SUBMITTED', 'freelancer', []],
    ['CHANGES_REQUESTED', 'client', []],
    ['CHANGES_REQUESTED', 'freelancer', ['submit']],
  ]
  const milestoneSteps = ['fund', 'submit', 'requestChanges', 'approve']
  it.each(table)('%s as %s', (status, side, expected) => {
    const c = contractOf([milestoneOf(1, 'APPROVED'), milestoneOf(2, status)], { held: held(status), viewerRole: side })
    const viewer = side === 'client' ? CLIENT : FREELANCER
    const actions = contractActions(c, viewer)
    expect(actions.filter((a) => milestoneSteps.includes(a))).toEqual(expected)
    expect(actions).toContain('message')
    expect(actions).toContain('proposeAmendment')
  })
})

describe('contractActions for ending', () => {
  it('lets the client end alone only while nothing is held', () => {
    const free = contractActions(contractOf([milestoneOf(1, 'PENDING')]), CLIENT)
    expect(free).toContain('endNow')
    expect(free).not.toContain('requestEnd')
    const held = contractActions(contractOf([milestoneOf(1, 'FUNDED')], { held: 500 }), CLIENT)
    expect(held).not.toContain('endNow')
    expect(held).toContain('requestEnd')
  })
  it('never lets the freelancer end alone', () => {
    const actions = contractActions(contractOf([milestoneOf(1, 'PENDING')], { viewerRole: 'freelancer' }), FREELANCER)
    expect(actions).not.toContain('endNow')
    expect(actions).toContain('requestEnd')
  })
  it('gives the asker Withdraw and the other side Accept and Decline', () => {
    const c = contractOf([milestoneOf(1, 'FUNDED')], { held: 500, endRequest: endRequest(CLIENT) })
    const mine = contractActions(c, CLIENT)
    expect(mine).toContain('withdrawEnd')
    expect(mine).not.toContain('acceptEnd')
    expect(mine).not.toContain('requestEnd')
    const theirs = contractActions({ ...c, viewerRole: 'freelancer' }, FREELANCER)
    expect(theirs).toEqual(expect.arrayContaining(['acceptEnd', 'declineEnd']))
    expect(theirs).not.toContain('withdrawEnd')
  })
  it('hides End contract from the client while the freelancer asks to end (the client answers the request)', () => {
    const c = contractOf([milestoneOf(1, 'PENDING')], { endRequest: endRequest(FREELANCER) })
    const actions = contractActions(c, CLIENT)
    expect(actions).toEqual(expect.arrayContaining(['acceptEnd', 'declineEnd']))
    expect(actions).not.toContain('endNow')
  })
  it('lets the freelancer accept the client request on submitted work only with the choice made for that work', () => {
    const submitted = (createdAt: string) =>
      milestoneOf(1, 'SUBMITTED', { submittedAt: createdAt, submissions: [{ id: 1, number: 1, note: 'x', images: [], links: [], feedback: null, createdAt }] })
    const asFreelancer = (m: MilestoneView, choice: 'APPROVE' | null) =>
      contractActions(contractOf([m], { held: 500, viewerRole: 'freelancer', endRequest: endRequest(CLIENT, choice) }), FREELANCER)
    expect(asFreelancer(submitted('2030-01-04T00:00:00.000Z'), 'APPROVE')).toContain('acceptEnd')
    // No choice: the work was sent after the request.
    expect(asFreelancer(submitted('2030-01-04T00:00:00.000Z'), null)).not.toContain('acceptEnd')
    // A newer submission than the request.
    expect(asFreelancer(submitted('2030-01-06T00:00:00.000Z'), 'APPROVE')).not.toContain('acceptEnd')
    expect(asFreelancer(submitted('2030-01-06T00:00:00.000Z'), 'APPROVE')).toContain('declineEnd')
  })
})

describe('contractActions for change requests', () => {
  it('lets the asker withdraw and the other side accept or decline; nobody proposes a second one', () => {
    const c = contractOf([milestoneOf(1, 'PENDING')], { amendments: [amendment(FREELANCER)] })
    const client = contractActions(c, CLIENT)
    expect(client).toEqual(expect.arrayContaining(['acceptAmendment', 'declineAmendment']))
    expect(client).not.toContain('withdrawAmendment')
    expect(client).not.toContain('proposeAmendment')
    const freelancer = contractActions({ ...c, viewerRole: 'freelancer' }, FREELANCER)
    expect(freelancer).toContain('withdrawAmendment')
    expect(freelancer).not.toContain('acceptAmendment')
    expect(freelancer).not.toContain('proposeAmendment')
  })
  it('works the same when the client asked', () => {
    const c = contractOf([milestoneOf(1, 'PENDING')], { amendments: [amendment(CLIENT)] })
    expect(contractActions(c, CLIENT)).toContain('withdrawAmendment')
    expect(contractActions({ ...c, viewerRole: 'freelancer' }, FREELANCER)).toEqual(expect.arrayContaining(['acceptAmendment', 'declineAmendment']))
  })
  it('ignores closed change requests', () => {
    const c = contractOf([milestoneOf(1, 'PENDING')], { amendments: [{ ...amendment(FREELANCER), status: 'DECLINED' }] })
    expect(contractActions(c, CLIENT)).toContain('proposeAmendment')
  })
})

describe('contractActions on a finished contract', () => {
  it('ENDED: only Message, plus the review when canReview', () => {
    const c = contractOf([milestoneOf(1, 'APPROVED'), milestoneOf(2, 'CANCELLED')], { status: 'ENDED', endReason: 'MUTUAL' })
    expect(contractActions(c, CLIENT)).toEqual(['message'])
    expect(contractActions({ ...c, canReview: true }, CLIENT)).toEqual(['review', 'message'])
    expect(contractActions({ ...c, viewerRole: 'freelancer' }, FREELANCER)).toEqual(['message'])
  })
  it('COMPLETED with and without a review', () => {
    const c = contractOf([milestoneOf(1, 'APPROVED')], { status: 'COMPLETED', canReview: true })
    expect(contractActions(c, CLIENT)).toEqual(['review', 'message'])
    const reviewed = { ...c, canReview: false, review: { id: 1, rating: 5, content: 'Great' } }
    expect(contractActions(reviewed, CLIENT)).toEqual(['message'])
  })
})

describe('contractActions for someone who is not on the contract (an admin reading it)', () => {
  it('gives nothing, even though the server shows the admin as the client', () => {
    const c = contractOf([milestoneOf(1, 'SUBMITTED')], { held: 500, canReview: true, amendments: [amendment(FREELANCER)], endRequest: endRequest(FREELANCER) })
    expect(contractActions(c, ADMIN)).toEqual([])
  })
})

describe('currentMilestone and dialogStillAllowed', () => {
  it('finds the first milestone that is not paid or cancelled', () => {
    const c = contractOf([milestoneOf(1, 'APPROVED'), milestoneOf(2, 'FUNDED'), milestoneOf(3, 'PENDING')])
    expect(currentMilestone(c)?.position).toBe(2)
    expect(currentMilestone(contractOf([milestoneOf(1, 'APPROVED')]))).toBeNull()
  })
  it('keeps a milestone dialog only while that milestone still allows the step', () => {
    const c = contractOf([milestoneOf(1, 'SUBMITTED')], { held: 500 })
    expect(dialogStillAllowed({ type: 'approve', milestoneId: 41 }, c, CLIENT)).toBe(true)
    expect(dialogStillAllowed({ type: 'approve', milestoneId: 42 }, c, CLIENT)).toBe(false)
    const approved = contractOf([milestoneOf(1, 'APPROVED'), milestoneOf(2, 'PENDING')])
    expect(dialogStillAllowed({ type: 'approve', milestoneId: 41 }, approved, CLIENT)).toBe(false)
    expect(dialogStillAllowed({ type: 'proposeAmendment' }, approved, CLIENT)).toBe(true)
    expect(dialogStillAllowed({ type: 'review' }, approved, CLIENT)).toBe(false)
  })
})

describe('timeSpan', () => {
  it('uses whole days, then hours, then minutes', () => {
    expect(timeSpan(3 * 86_400_000)).toBe('3 days')
    expect(timeSpan(86_400_000 + 3_600_000)).toBe('1 day')
    expect(timeSpan(5 * 3_600_000 + 10)).toBe('5 hours')
    expect(timeSpan(3_600_000)).toBe('1 hour')
    expect(timeSpan(9 * 60_000 + 1)).toBe('10 minutes')
    expect(timeSpan(30_000)).toBe('1 minute')
  })
})

describe('milestoneClock', () => {
  const now = new Date('2030-01-10T00:00:00.000Z')
  it('counts the time left before the due date', () => {
    const m = milestoneOf(1, 'FUNDED', { dueDate: '2030-01-13T00:00:00.000Z', fundedAt: '2030-01-02T00:00:00.000Z' })
    expect(milestoneClock(contractOf([m]), m, now)).toEqual({ text: '3 days left', warn: false })
  })
  it('after the due date, counts the window left to submit', () => {
    const m = milestoneOf(1, 'FUNDED', { dueDate: '2030-01-09T00:00:00.000Z', fundedAt: '2030-01-02T00:00:00.000Z' })
    expect(milestoneClock(contractOf([m]), m, now)).toEqual({ text: 'Due date passed · 2 days left to submit', warn: true })
  })
  it('starts the late window at the request for changes when that came after the due date', () => {
    const m = milestoneOf(1, 'CHANGES_REQUESTED', { dueDate: '2030-01-05T00:00:00.000Z', changesRequestedAt: '2030-01-09T00:00:00.000Z' })
    expect(milestoneClock(contractOf([m]), m, now)?.text).toBe('Due date passed · 2 days left to submit')
  })
  it('counts down to the auto-approval of submitted work', () => {
    const m = milestoneOf(1, 'SUBMITTED', { submittedAt: '2030-01-08T00:00:00.000Z' })
    expect(milestoneClock(contractOf([m]), m, now)).toEqual({ text: 'Auto-approves in 1 day', warn: true })
  })
  it('follows a short demo window (graceMinutes)', () => {
    const m = milestoneOf(1, 'SUBMITTED', { submittedAt: '2030-01-09T23:58:00.000Z' })
    expect(milestoneClock(contractOf([m], { graceMinutes: 5 }), m, now)?.text).toBe('Auto-approves in 3 minutes')
  })
  it('counts the window to fund the next milestone from the approval of the one before', () => {
    const one = milestoneOf(1, 'APPROVED', { approvedAt: '2030-01-09T00:00:00.000Z' })
    const two = milestoneOf(2, 'PENDING')
    expect(milestoneClock(contractOf([one, two]), two, now)).toEqual({ text: '2 days left to fund', warn: false })
    // Milestone 1 counts from the start of the contract.
    const first = milestoneOf(1, 'PENDING')
    expect(milestoneClock(contractOf([first], { createdAt: '2030-01-09T12:00:00.000Z' }), first, now)?.text).toBe('2 days left to fund')
  })
  it('has no funding window on an imported contract', () => {
    const first = milestoneOf(1, 'PENDING')
    expect(milestoneClock(contractOf([first], { imported: true }), first, now)).toBeNull()
  })
  it('says when the window is over but the server has not acted yet', () => {
    const m = milestoneOf(1, 'SUBMITTED', { submittedAt: '2030-01-01T00:00:00.000Z' })
    expect(milestoneClock(contractOf([m]), m, now)?.text).toBe('Auto-approves any moment now')
  })
})
