import type { ProposalDetail } from '@/shared/schemas'

export type ProposalActions = { accept: boolean; counter: boolean; decline: boolean; withdraw: boolean }

/**
 * Which buttons the viewer gets on a proposal. Accept, Counter and Decline belong to the person whose turn it is.
 * Withdraw belongs to the person who sent the latest version (so, while it is open, the person who is waiting).
 * The server checks all of this again; this only decides what to draw.
 */
export function proposalActions(p: Pick<ProposalDetail, 'status' | 'turnUserId' | 'versions'>, viewerId: number): ProposalActions {
  const none = { accept: false, counter: false, decline: false, withdraw: false }
  if (p.status !== 'OPEN') return none
  const myTurn = p.turnUserId === viewerId
  const author = p.versions.length ? p.versions[p.versions.length - 1].authorId : null
  return { accept: myTurn, counter: myTurn, decline: myTurn, withdraw: !myTurn && author === viewerId }
}
