import type { ContractDetail, ContractListItem, MilestoneStatus, ProposalDetail, ProposalListItem } from '@/shared/schemas'

type Item = ContractListItem | ProposalListItem | ContractDetail | ProposalDetail
type Action = { label: string; mine: boolean }

const NONE: Action = { label: '', mine: false }

/** A proposal has `latestVersion`; a contract does not. */
const isProposal = (item: Item): item is ProposalListItem | ProposalDetail => 'latestVersion' in item
/** Only the detail of a contract carries its milestones, change requests and end request. */
const isContractDetail = (item: ContractListItem | ContractDetail): item is ContractDetail => 'milestones' in item

type Current = { position: number; status: MilestoneStatus }

/** The first milestone that is not paid or cancelled (the one the contract is working on). */
function currentMilestone(c: ContractListItem | ContractDetail): Current | null {
  if (!isContractDetail(c)) return c.currentMilestone
  return c.milestones.find((m) => m.status !== 'APPROVED' && m.status !== 'CANCELLED') ?? null
}

/** What the viewer must do on the current milestone, or null when it is the other person's step. */
function milestoneStep(side: 'client' | 'freelancer', m: Current): string | null {
  const n = m.position
  if (side === 'client') {
    if (m.status === 'PENDING') return `Fund milestone ${n}`
    if (m.status === 'SUBMITTED') return 'Review submission'
    return null
  }
  if (m.status === 'FUNDED') return `Submit milestone ${n}`
  if (m.status === 'CHANGES_REQUESTED') return `Send changes for milestone ${n}`
  return null
}

/**
 * The one thing that comes next on a proposal or contract, for the viewer.
 * `mine` is true when the viewer must act (the screens show it in bold green).
 * A closed proposal, an ended contract and a finished one without a review to leave have no next action (an empty label).
 *
 * The contract list does not say who sent an open change request, so on a list row only the end request and
 * the milestone step are read; the full contract (the panel) also reads the change request.
 */
export function nextAction(item: Item, viewerId: number): Action {
  const otherName = item.viewerRole === 'client' ? item.freelancer.name : item.client.name
  const waiting: Action = { label: `Waiting for ${otherName}`, mine: false }

  if (isProposal(item)) {
    if (item.status !== 'OPEN') return NONE
    return item.turnUserId === viewerId ? { label: 'Answer proposal', mine: true } : waiting
  }

  if (item.status === 'COMPLETED') {
    return isContractDetail(item) && item.canReview && item.viewerRole === 'client' ? { label: 'Leave a review', mine: true } : NONE
  }
  if (item.status !== 'ACTIVE') return NONE

  // Questions for the viewer come first: they stop the other side from going on.
  const endRequestedBy = isContractDetail(item) ? (item.endRequest?.byUserId ?? null) : item.endRequestedById
  if (endRequestedBy !== null && endRequestedBy !== viewerId) return { label: 'Answer end request', mine: true }
  const openChange = isContractDetail(item) ? item.amendments.find((a) => a.status === 'OPEN') : undefined
  if (openChange && openChange.proposerId !== viewerId) return { label: 'Answer change request', mine: true }

  const milestone = currentMilestone(item)
  const step = milestone ? milestoneStep(item.viewerRole, milestone) : null
  if (step) return { label: step, mine: true }

  // Nothing to do: the viewer waits for the other person (who may also hold a question the viewer sent).
  return milestone || endRequestedBy !== null || openChange ? waiting : NONE
}
