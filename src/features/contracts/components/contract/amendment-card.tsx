import { formatPipelineTime } from '@/features/hiring-pipeline/format-time'
import type { AmendmentView, ContractDetail } from '@/shared/schemas'
import { Button } from '@/shared/ui'
import { describeAmendment } from '../../utils/amendment-changes'

/**
 * The open change request: who asked, the note, and each change in words. The other person gets Accept and Decline;
 * the person who asked gets Withdraw. Buttons appear only when the panel passes their handler.
 */
export function AmendmentCard({
  amendment,
  contract,
  viewerId,
  pending,
  onAccept,
  onDecline,
  onWithdraw,
}: {
  amendment: AmendmentView
  contract: ContractDetail
  viewerId: number
  pending: boolean
  onAccept?: () => void
  onDecline?: () => void
  onWithdraw?: () => void
}) {
  const mine = amendment.proposerId === viewerId
  const asker = amendment.proposerId === contract.client.id ? contract.client.name : contract.freelancer.name
  const lines = describeAmendment(amendment, contract)
  return (
    <section className="mt-4 rounded-lg border border-border bg-surface-muted p-4" aria-label="Change request">
      <h3 className="font-display text-base font-medium">{mine ? 'You asked for a change' : `${asker} asked for a change`}</h3>
      <p className="mt-0.5 text-xs text-muted">Sent {formatPipelineTime(amendment.createdAt)}</p>
      {amendment.note ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{amendment.note}</p> : null}
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm" aria-label="What changes">
        {lines.map((line) => <li key={line} className="break-words">{line}</li>)}
      </ul>
      {mine ? <p className="mt-2 text-sm text-muted">Waiting for {contract.client.id === viewerId ? contract.freelancer.name : contract.client.name} to answer.</p> : null}
      {onAccept || onDecline || onWithdraw ? (
        <div className="mt-3 flex flex-wrap gap-2 pr-24 lg:pr-0">
          {onAccept ? <Button type="button" size="sm" disabled={pending} onClick={onAccept}>Accept</Button> : null}
          {onDecline ? <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={onDecline}>Decline</Button> : null}
          {onWithdraw ? <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={onWithdraw}>Withdraw</Button> : null}
        </div>
      ) : null}
    </section>
  )
}
