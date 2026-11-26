import { describe, expect, it } from 'vitest'
import { nextAction } from '../next-action'

const ann = { id: 1, name: 'Ann Client', avatar: null }
const bob = { id: 2, name: 'Bob Maker', avatar: null }
const job = { id: 9, title: 'Logo design', image: null, price: 100 }
const CLIENT = 1
const FREELANCER = 2

const proposal = (over: Record<string, unknown> = {}) => ({
  id: 5, status: 'OPEN', job, client: ann, freelancer: bob, latestVersion: 1, turnUserId: FREELANCER,
  total: 100, deadline: '2030-01-01', expiresAt: '2030-01-01', updatedAt: '2030-01-01', viewerRole: 'client', ...over,
}) as never

const milestone = (status: string, position = 2) => ({
  id: 40 + position, position, title: 'Draft', status, dueDate: '2030-01-01', amount: 50, submittedAt: null,
})
const contract = (current: ReturnType<typeof milestone> | null, over: Record<string, unknown> = {}) => ({
  id: 7, status: 'ACTIVE', endReason: null, title: 'Logo', job, client: ann, freelancer: bob, total: 100, paid: 0, held: 0,
  currentMilestone: current, milestoneCount: 3, hasOpenAmendment: false, endRequestedById: null, viewerRole: 'client', updatedAt: '2030-01-01', ...over,
}) as never

describe('nextAction for a proposal', () => {
  it('asks the person whose turn it is to answer', () => {
    expect(nextAction(proposal(), FREELANCER)).toEqual({ label: 'Answer proposal', mine: true })
    expect(nextAction(proposal({ turnUserId: CLIENT }), CLIENT)).toEqual({ label: 'Answer proposal', mine: true })
  })
  it('says who is awaited when it is the other turn', () => {
    expect(nextAction(proposal(), CLIENT)).toEqual({ label: 'Waiting for Bob Maker', mine: false })
    expect(nextAction(proposal({ turnUserId: CLIENT, viewerRole: 'freelancer' }), FREELANCER)).toEqual({ label: 'Waiting for Ann Client', mine: false })
  })
  it('has no next action once closed', () => {
    for (const status of ['ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED']) {
      expect(nextAction(proposal({ status, turnUserId: null }), CLIENT)).toEqual({ label: '', mine: false })
    }
  })
})

describe('nextAction for a contract milestone', () => {
  const table: [string, string, string, boolean][] = [
    // status, side, label, mine
    ['PENDING', 'client', 'Fund milestone 2', true],
    ['PENDING', 'freelancer', 'Waiting for Ann Client', false],
    ['FUNDED', 'client', 'Waiting for Bob Maker', false],
    ['FUNDED', 'freelancer', 'Submit milestone 2', true],
    ['SUBMITTED', 'client', 'Review submission', true],
    ['SUBMITTED', 'freelancer', 'Waiting for Ann Client', false],
    ['CHANGES_REQUESTED', 'client', 'Waiting for Bob Maker', false],
    ['CHANGES_REQUESTED', 'freelancer', 'Send changes for milestone 2', true],
  ]
  it.each(table)('%s as %s', (status, side, label, mine) => {
    const viewer = side === 'client' ? CLIENT : FREELANCER
    expect(nextAction(contract(milestone(status), { viewerRole: side }), viewer)).toEqual({ label, mine })
  })

  it('has nothing to do when no milestone is left', () => {
    expect(nextAction(contract(null), CLIENT)).toEqual({ label: '', mine: false })
  })
})

describe('nextAction for end requests, amendments and reviews', () => {
  it('asks the other side to answer an end request, before any milestone step', () => {
    const c = contract(milestone('PENDING'), { endRequestedById: FREELANCER })
    expect(nextAction(c, CLIENT)).toEqual({ label: 'Answer end request', mine: true })
  })
  it('keeps the own milestone step when the viewer asked for the end', () => {
    const c = contract(milestone('PENDING'), { endRequestedById: CLIENT })
    expect(nextAction(c, CLIENT)).toEqual({ label: 'Fund milestone 2', mine: true })
  })
  it('waits for the other person on an end request the viewer sent', () => {
    const c = contract(milestone('FUNDED'), { endRequestedById: CLIENT })
    expect(nextAction(c, CLIENT)).toEqual({ label: 'Waiting for Bob Maker', mine: false })
    const other = contract(milestone('PENDING'), { endRequestedById: CLIENT, viewerRole: 'freelancer' })
    expect(nextAction(other, FREELANCER).label).toBe('Answer end request')
  })

  const detail = (over: Record<string, unknown>) => ({
    ...(contract(null) as object),
    milestones: [{ ...milestone('FUNDED', 1) }],
    amendments: [], endRequest: null, canReview: false, review: null, ...over,
  }) as never

  it('reads an open change request from the detail: the proposer waits, the other answers', () => {
    const open = { id: 3, status: 'OPEN', proposerId: FREELANCER }
    expect(nextAction(detail({ amendments: [open] }), CLIENT)).toEqual({ label: 'Answer change request', mine: true })
    expect(nextAction(detail({ amendments: [open], viewerRole: 'freelancer' }), FREELANCER)).toEqual({ label: 'Submit milestone 1', mine: true })
    expect(nextAction(detail({ amendments: [{ ...open, status: 'DECLINED' }] }), CLIENT).label).toBe('Waiting for Bob Maker')
  })
  it('reads an end request from the detail', () => {
    const endRequest = { byUserId: FREELANCER, note: null, choice: null, requestedAt: 'x' }
    expect(nextAction(detail({ endRequest }), CLIENT)).toEqual({ label: 'Answer end request', mine: true })
  })
  it('uses the first milestone that is still open in the detail', () => {
    const milestones = [{ ...milestone('APPROVED', 1) }, { ...milestone('SUBMITTED', 2) }, { ...milestone('PENDING', 3) }]
    expect(nextAction(detail({ milestones }), CLIENT)).toEqual({ label: 'Review submission', mine: true })
  })
  it('offers a review to the client of a completed contract that can be reviewed', () => {
    expect(nextAction(detail({ status: 'COMPLETED', milestones: [], canReview: true }), CLIENT)).toEqual({ label: 'Leave a review', mine: true })
    expect(nextAction(detail({ status: 'COMPLETED', milestones: [], canReview: false }), CLIENT)).toEqual({ label: '', mine: false })
    expect(nextAction(detail({ status: 'COMPLETED', milestones: [], canReview: true, viewerRole: 'freelancer' }), FREELANCER)).toEqual({ label: '', mine: false })
  })
  it('offers a review on an ended contract too when the server says canReview', () => {
    expect(nextAction(detail({ status: 'ENDED', endReason: 'MUTUAL', milestones: [], canReview: true }), CLIENT)).toEqual({ label: 'Leave a review', mine: true })
  })
  it('shows no review label on a list row (it has no canReview)', () => {
    expect(nextAction(contract(null, { status: 'COMPLETED' }), CLIENT)).toEqual({ label: '', mine: false })
  })
  it('has no next action on an ended contract', () => {
    expect(nextAction(contract(milestone('PENDING'), { status: 'ENDED', endReason: 'MUTUAL' }), CLIENT)).toEqual({ label: '', mine: false })
  })
})
