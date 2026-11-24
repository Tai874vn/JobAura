import type { ContractStatus, EndReason, MilestoneStatus, ProposalStatus } from '@/shared/schemas'

/** The words for a proposal. An open one says whose turn it is ("Waiting for you" / "Waiting for Ann"). */
export function proposalLabel(
  p: { status: ProposalStatus; turnUserId: number | null },
  viewerId: number,
  otherName: string,
): string {
  switch (p.status) {
    case 'OPEN':
      return p.turnUserId === viewerId ? 'Waiting for you' : `Waiting for ${otherName}`
    case 'ACCEPTED':
      return 'Accepted'
    case 'DECLINED':
      return 'Declined'
    case 'WITHDRAWN':
      return 'Withdrawn'
    case 'EXPIRED':
      return 'Expired'
  }
}

const contractWords: Record<ContractStatus, string> = { ACTIVE: 'Active', COMPLETED: 'Completed', ENDED: 'Ended' }

const endReasonLines: Record<EndReason, string> = {
  FREELANCER_LATE: 'Ended: work was late',
  CLIENT_SILENT: 'Ended: submission auto-approved',
  NOT_FUNDED: 'Ended: next milestone not funded',
  MUTUAL: 'Ended by agreement',
  CLIENT_ENDED: 'Ended by the client',
}

/** The status word of a contract. The reason an ended contract stopped is a second line: see `endReasonLine`. */
export function contractLabel(c: { status: ContractStatus; endReason: EndReason | null }): string {
  return contractWords[c.status]
}

/** The line that says why a contract ended; null while it is not ended (or the reason is unknown). */
export function endReasonLine(c: { status: ContractStatus; endReason: EndReason | null }): string | null {
  return c.status === 'ENDED' && c.endReason ? endReasonLines[c.endReason] : null
}

const milestoneWords: Record<MilestoneStatus, string> = {
  PENDING: 'Not funded',
  FUNDED: 'In progress',
  SUBMITTED: 'Waiting for review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Paid',
  CANCELLED: 'Cancelled',
}

export function milestoneLabel(status: MilestoneStatus): string {
  return milestoneWords[status]
}
