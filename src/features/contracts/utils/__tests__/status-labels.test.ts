import { describe, expect, it } from 'vitest'
import type { ContractStatus, EndReason, MilestoneStatus, ProposalStatus } from '@/shared/schemas'
import { contractLabel, endReasonLine, milestoneLabel, proposalLabel } from '../status-labels'

describe('proposalLabel', () => {
  it('says whose turn an open proposal waits for', () => {
    expect(proposalLabel({ status: 'OPEN', turnUserId: 7 }, 7, 'Ann')).toBe('Waiting for you')
    expect(proposalLabel({ status: 'OPEN', turnUserId: 9 }, 7, 'Ann')).toBe('Waiting for Ann')
  })

  it('names every closed status', () => {
    const words: [ProposalStatus, string][] = [
      ['ACCEPTED', 'Accepted'],
      ['DECLINED', 'Declined'],
      ['WITHDRAWN', 'Withdrawn'],
      ['EXPIRED', 'Expired'],
    ]
    for (const [status, word] of words) expect(proposalLabel({ status, turnUserId: null }, 7, 'Ann')).toBe(word)
  })
})

describe('contractLabel and endReasonLine', () => {
  it('names every contract status', () => {
    const words: [ContractStatus, string][] = [['ACTIVE', 'Active'], ['COMPLETED', 'Completed'], ['ENDED', 'Ended']]
    for (const [status, word] of words) expect(contractLabel({ status, endReason: null })).toBe(word)
  })

  it('gives a reason line for every end reason, only when ended', () => {
    const lines: [EndReason, string][] = [
      ['FREELANCER_LATE', 'Ended: work was late'],
      ['CLIENT_SILENT', 'Ended: submission auto-approved'],
      ['NOT_FUNDED', 'Ended: next milestone not funded'],
      ['MUTUAL', 'Ended by agreement'],
      ['CLIENT_ENDED', 'Ended by the client'],
    ]
    for (const [endReason, line] of lines) expect(endReasonLine({ status: 'ENDED', endReason })).toBe(line)
    expect(endReasonLine({ status: 'ACTIVE', endReason: null })).toBeNull()
    expect(endReasonLine({ status: 'ENDED', endReason: null })).toBeNull()
  })
})

describe('milestoneLabel', () => {
  it('names every milestone status', () => {
    const words: [MilestoneStatus, string][] = [
      ['PENDING', 'Not funded'],
      ['FUNDED', 'In progress'],
      ['SUBMITTED', 'Waiting for review'],
      ['CHANGES_REQUESTED', 'Changes requested'],
      ['APPROVED', 'Paid'],
      ['CANCELLED', 'Cancelled'],
    ]
    for (const [status, word] of words) expect(milestoneLabel(status)).toBe(word)
  })
})
