import type { ContractEventView } from '@/shared/schemas'
import { credits } from '@/shared/lib/credits'
import { formatPipelineTime } from '@/features/hiring-pipeline/utils/format-time'

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const num = (value: unknown) => (typeof value === 'number' ? value : null)

/** "some_new_type" becomes "Some new type", so a type the frontend does not know yet still reads well. */
function humanize(type: string) {
  const words = type.replace(/_/g, ' ').trim()
  return words ? words[0].toUpperCase() + words.slice(1) : 'Update'
}

const ruleWords: Record<string, string> = {
  CLIENT_SILENT: 'a submission waiting for review',
  FREELANCER_LATE: 'work that is late',
  NOT_FUNDED: 'a milestone that is not funded',
}

const endReasonWords: Record<string, string> = {
  FREELANCER_LATE: 'the work was late',
  CLIENT_SILENT: 'a submission was auto-approved',
  NOT_FUNDED: 'the next milestone was not funded',
  MUTUAL: 'both sides agreed',
  CLIENT_ENDED: 'the client ended it',
}

/**
 * One plain sentence for a history row, and a smaller detail line when the row has one.
 * `data` may be `{}` or missing, so every key is read defensively. A row with no person was done by JobAura (the system).
 */
export function describeContractEvent(event: ContractEventView): { title: string; detail?: string } {
  const data = (event.data && typeof event.data === 'object' ? event.data : {}) as Record<string, unknown>
  const who = event.actor?.name ?? 'JobAura'
  const note = text(data.note) ?? undefined
  const position = num(data.position)
  const milestone = position !== null ? `milestone ${position}` : 'a milestone'
  const amount = num(data.amount)
  const total = num(data.total)

  switch (event.type) {
    case 'proposal_sent':
      return { title: `${who} sent a proposal`, detail: total !== null ? `Total ${credits(total)}` : undefined }
    case 'proposal_countered':
      return { title: `${who} sent a counter-offer`, detail: total !== null ? `Total ${credits(total)}` : undefined }
    case 'proposal_accepted':
      return { title: `${who} accepted the proposal` }
    case 'proposal_declined':
      return { title: `${who} declined the proposal`, detail: note }
    case 'proposal_withdrawn':
      return { title: `${who} withdrew the proposal` }
    case 'proposal_expired':
      return { title: 'The proposal expired after 7 days without an answer' }
    case 'contract_started':
      return { title: 'The contract started', detail: total !== null ? `Total ${credits(total)}` : undefined }
    case 'milestone_funded':
      return { title: `${who} funded ${milestone}`, detail: amount !== null ? credits(amount) : undefined }
    case 'work_submitted': {
      const submission = num(data.submission)
      return { title: `${who} submitted work for ${milestone}`, detail: submission !== null ? `Submission ${submission}` : undefined }
    }
    case 'changes_requested':
      return { title: `${who} asked for changes on ${milestone}`, detail: note }
    case 'milestone_approved':
      return {
        title: data.auto === true ? `JobAura approved ${milestone} because no answer came in time` : `${who} approved ${milestone}`,
        detail: amount !== null ? `${credits(amount)} paid` : undefined,
      }
    case 'milestone_refunded':
      return { title: `Credits for ${milestone} went back to the client`, detail: amount !== null ? credits(amount) : undefined }
    case 'milestone_cancelled':
      return { title: `${milestone[0].toUpperCase()}${milestone.slice(1)} was cancelled` }
    case 'warning_sent': {
      const rule = typeof data.rule === 'string' ? ruleWords[data.rule] : undefined
      return { title: `JobAura sent a warning about ${milestone}`, detail: rule ? `The problem: ${rule}` : undefined }
    }
    case 'amendment_proposed':
      return { title: `${who} asked for a change to the contract` }
    case 'amendment_accepted':
      return { title: `${who} accepted the change request` }
    case 'amendment_declined':
      return { title: `${who} declined the change request`, detail: note }
    case 'amendment_withdrawn':
      return { title: `${who} withdrew the change request` }
    case 'end_requested': {
      const choice = data.choice === 'APPROVE' ? 'Pay for the submitted work' : data.choice === 'REFUND' ? 'Take the credits back' : undefined
      return { title: `${who} asked to end the contract`, detail: [note, choice].filter(Boolean).join(' · ') || undefined }
    }
    case 'end_request_declined':
      return { title: `${who} declined the end request` }
    case 'end_request_withdrawn':
      return { title: `${who} withdrew the end request` }
    case 'contract_completed':
      return { title: 'The contract is completed' }
    case 'contract_ended': {
      const reason = typeof data.reason === 'string' ? endReasonWords[data.reason] : undefined
      return { title: 'The contract ended', detail: reason ? `Because ${reason}` : undefined }
    }
    case 'review_left': {
      const rating = num(data.rating)
      return { title: `${who} left a review`, detail: rating !== null ? `${rating} out of 5` : undefined }
    }
    case 'imported':
      return { title: 'Copied from an earlier hire' }
    default:
      return { title: humanize(event.type) }
  }
}

/** The history of a proposal or contract, oldest first, as the backend sends it. */
export function ContractTimeline({ events }: { events: ContractEventView[] }) {
  if (!events.length) return <p className="text-sm text-muted">No history yet.</p>
  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const { title, detail } = describeContractEvent(event)
        return (
          <li key={event.id} className="relative pl-5">
            <span aria-hidden className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
            <p className="break-words text-sm font-medium">{title}</p>
            {detail ? <p className="mt-0.5 break-words text-sm text-muted">{detail}</p> : null}
            <p className="mt-0.5 text-xs text-muted">{formatPipelineTime(event.createdAt)}</p>
          </li>
        )
      })}
    </ol>
  )
}
