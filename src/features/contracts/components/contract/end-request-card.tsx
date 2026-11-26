import { formatPipelineTime } from '@/features/hiring-pipeline/format-time'
import type { ContractDetail } from '@/shared/schemas'
import { Button } from '@/shared/ui'
import { freelancerCanAcceptEnd } from '../../utils/contract-actions'

/**
 * The open end request: who asked, when, the note, and the client's choice for submitted work (if one was made).
 * The other person gets Accept and Decline; the asker gets Withdraw. Buttons appear only when the panel passes their handler.
 */
export function EndRequestCard({
  contract,
  viewerId,
  pending,
  onAccept,
  onDecline,
  onWithdraw,
}: {
  contract: ContractDetail
  viewerId: number
  pending: boolean
  onAccept?: () => void
  onDecline?: () => void
  onWithdraw?: () => void
}) {
  const request = contract.endRequest
  if (!request) return null
  const mine = request.byUserId === viewerId
  const asker = request.byUserId === contract.client.id ? contract.client.name : contract.freelancer.name
  const other = contract.client.id === viewerId ? contract.freelancer.name : contract.client.name
  // The freelancer answers a client request while new work waits for review: the server refuses, so say why.
  const workChanged = !mine && viewerId === contract.freelancer.id && !freelancerCanAcceptEnd(contract)

  return (
    <section className="mt-4 rounded-lg border border-danger/25 bg-surface p-4" aria-label="End request">
      <h3 className="font-display text-base font-medium">{mine ? 'You asked to end the contract' : `${asker} asked to end the contract`}</h3>
      <p className="mt-0.5 text-xs text-muted">Sent {formatPipelineTime(request.requestedAt)}</p>
      {request.note ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{request.note}</p> : null}
      {request.choice ? <p className="mt-2 text-sm">The client chose for the submitted work: {request.choice === 'APPROVE' ? 'approve and pay for it' : 'refund it to the client'}.</p> : null}
      {mine ? <p className="mt-2 text-sm text-muted">Waiting for {other} to answer. The contract goes on meanwhile.</p> : null}
      {workChanged ? <p className="mt-2 text-sm text-muted">Work was submitted after the end request. Ask the client to send a new one.</p> : null}
      {onAccept || onDecline || onWithdraw ? (
        <div className="mt-3 flex flex-wrap gap-2 pr-24 lg:pr-0">
          {onAccept ? <Button type="button" size="sm" variant="danger" disabled={pending} onClick={onAccept}>Accept and end</Button> : null}
          {onDecline ? <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={onDecline}>Decline</Button> : null}
          {onWithdraw ? <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={onWithdraw}>Withdraw</Button> : null}
        </div>
      ) : null}
    </section>
  )
}
