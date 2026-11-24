import type { ContractDetail, MilestoneView } from '@/shared/schemas'

/** Every button the contract panel can show. */
export type ContractAction =
  | 'fund'
  | 'submit'
  | 'requestChanges'
  | 'approve'
  | 'proposeAmendment'
  | 'requestEnd'
  | 'endNow'
  | 'acceptAmendment'
  | 'declineAmendment'
  | 'withdrawAmendment'
  | 'acceptEnd'
  | 'declineEnd'
  | 'withdrawEnd'
  | 'review'
  | 'message'

/** The order the buttons are listed in. */
const ORDER: ContractAction[] = [
  'fund', 'submit', 'requestChanges', 'approve',
  'acceptAmendment', 'declineAmendment', 'withdrawAmendment',
  'acceptEnd', 'declineEnd', 'withdrawEnd',
  'review', 'proposeAmendment', 'endNow', 'requestEnd', 'message',
]

/** The first milestone that is not paid or cancelled: the one the contract is working on. */
export function currentMilestone(c: ContractDetail): MilestoneView | null {
  return c.milestones.find((m) => m.status !== 'APPROVED' && m.status !== 'CANCELLED') ?? null
}

/** The open change request, if any (only one can be open at a time). */
export function openAmendment(c: ContractDetail) {
  return c.amendments.find((a) => a.status === 'OPEN') ?? null
}

/** The milestone that waits for the client's review, if any. */
export function submittedMilestone(c: ContractDetail): MilestoneView | null {
  return c.milestones.find((m) => m.status === 'SUBMITTED') ?? null
}

/**
 * Can the freelancer accept the client's end request? While work is SUBMITTED, the server only takes the client's
 * choice (approve or refund) for the exact work the client saw. No choice, or a submission newer than the request,
 * means the server answers 409 "Work was submitted after the end request...", so the button is not shown.
 */
export function freelancerCanAcceptEnd(c: ContractDetail): boolean {
  const request = c.endRequest
  if (!request) return false
  const work = submittedMilestone(c)
  if (!work) return true
  if (!request.choice) return false
  const latest = work.submissions[0]
  const sentAt = latest?.createdAt ?? work.submittedAt
  return !sentAt || new Date(sentAt).getTime() <= new Date(request.requestedAt).getTime()
}

/**
 * The buttons for this viewer, following the server's rules (the server still checks everything).
 * Someone who is not the client or the freelancer gets none: an admin can read a contract (the server shows the
 * admin as the client) but every action answers 403, so the panel is read-only for them.
 */
export function contractActions(c: ContractDetail, viewerId: number): ContractAction[] {
  const isClient = viewerId === c.client.id
  const isFreelancer = viewerId === c.freelancer.id
  if (!isClient && !isFreelancer) return []

  const out = new Set<ContractAction>(['message'])
  if (isClient && c.canReview && !c.review) out.add('review')
  if (c.status !== 'ACTIVE') return ORDER.filter((a) => out.has(a))

  const current = currentMilestone(c)
  if (current) {
    if (isClient && current.status === 'PENDING') out.add('fund')
    if (isClient && current.status === 'SUBMITTED') {
      out.add('requestChanges')
      out.add('approve')
    }
    if (isFreelancer && (current.status === 'FUNDED' || current.status === 'CHANGES_REQUESTED')) out.add('submit')
  }

  const change = openAmendment(c)
  if (!change) out.add('proposeAmendment')
  else if (change.proposerId === viewerId) out.add('withdrawAmendment')
  else {
    out.add('acceptAmendment')
    out.add('declineAmendment')
  }

  const request = c.endRequest
  const otherAsked = request !== null && request.byUserId !== viewerId
  // The client may end alone only while no credits are held. When the freelancer already asked, the client answers that request instead.
  const canEndNow = isClient && c.held === 0 && !otherAsked
  if (canEndNow) out.add('endNow')
  if (!request) {
    if (!canEndNow) out.add('requestEnd')
  } else if (request.byUserId === viewerId) {
    out.add('withdrawEnd')
  } else {
    if (isClient || freelancerCanAcceptEnd(c)) out.add('acceptEnd')
    out.add('declineEnd')
  }

  return ORDER.filter((a) => out.has(a))
}

/** The dialog that is open on the panel. Milestone and change-request dialogs remember which one they act on. */
export type ContractDialog =
  | { type: 'fund' | 'submit' | 'requestChanges' | 'approve'; milestoneId: number }
  | { type: 'proposeAmendment'; preset?: { milestoneId: number; amount: number } }
  | { type: 'acceptAmendment' | 'declineAmendment' | 'withdrawAmendment'; amendmentId: number }
  | { type: 'requestEnd' | 'endNow' | 'acceptEnd' | 'declineEnd' | 'withdrawEnd' | 'review' }

/** Is the open dialog still something the viewer may do on the contract as it is now (after it was read again)? */
export function dialogStillAllowed(dialog: ContractDialog, c: ContractDetail, viewerId: number): boolean {
  if (!contractActions(c, viewerId).includes(dialog.type)) return false
  if ('milestoneId' in dialog) return currentMilestone(c)?.id === dialog.milestoneId
  if ('amendmentId' in dialog) return openAmendment(c)?.id === dialog.amendmentId
  return true
}

const MINUTE = 60_000

/** A length of time as words: whole days, else whole hours, else minutes (rounded up), e.g. "3 days", "5 hours", "1 minute". */
export function timeSpan(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / MINUTE))
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (minutes >= 1440) return unit(Math.floor(minutes / 1440), 'day')
  if (minutes >= 60) return unit(Math.floor(minutes / 60), 'hour')
  return unit(minutes, 'minute')
}

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : Number.NEGATIVE_INFINITY)

/**
 * The time line under the current milestone, worked out the way the server's deadline job (the "sweeper") does it.
 * Each window is `graceMinutes` long:
 * - FUNDED / CHANGES_REQUESTED: before the due date "3 days left"; after it, the window to submit starts at the
 *   latest of the due date, the funding and the request for changes ("Due date passed · 2 days left to submit").
 * - SUBMITTED: the client has one window to answer, then the work is approved by itself ("Auto-approves in 1 day").
 * - PENDING: the client has one window to fund, from the approval of the milestone before (or the contract start).
 *   Imported contracts have no such window.
 * `warn` is true when the line should stand out (late, or less than a third of the window left).
 */
export function milestoneClock(c: ContractDetail, m: MilestoneView, now: Date = new Date()): { text: string; warn: boolean } | null {
  const grace = c.graceMinutes * MINUTE
  const nowMs = now.getTime()
  const short = (left: number) => left <= grace / 3

  if (m.status === 'FUNDED' || m.status === 'CHANGES_REQUESTED') {
    const due = time(m.dueDate)
    if (nowMs < due) return { text: `${timeSpan(due - nowMs)} left`, warn: false }
    const left = Math.max(due, time(m.fundedAt), time(m.changesRequestedAt)) + grace - nowMs
    return {
      text: left > 0 ? `Due date passed · ${timeSpan(left)} left to submit` : 'Due date passed · the contract can end any moment now',
      warn: true,
    }
  }
  if (m.status === 'SUBMITTED' && m.submittedAt) {
    const left = time(m.submittedAt) + grace - nowMs
    return { text: left > 0 ? `Auto-approves in ${timeSpan(left)}` : 'Auto-approves any moment now', warn: m.warnings.silent || short(left) }
  }
  if (m.status === 'PENDING' && !c.imported) {
    const index = c.milestones.findIndex((x) => x.id === m.id)
    const before = index > 0 ? c.milestones[index - 1] : null
    if (before && before.status !== 'APPROVED') return null
    const left = time(before ? before.approvedAt ?? c.createdAt : c.createdAt) + grace - nowMs
    return { text: left > 0 ? `${timeSpan(left)} left to fund` : 'Not funded in time · the contract can end any moment now', warn: m.warnings.unfunded || short(left) }
  }
  return null
}
