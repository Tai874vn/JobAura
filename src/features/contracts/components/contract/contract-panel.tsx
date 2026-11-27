'use client'

/**
 * Full detail panel for one contract on /contracts.
 * Combines the header, milestones, open change request and end request cards, action buttons, submitted work, event history, and contract dialogs.
 *
 * Calls: useContractActions; PanelFrame; ContractHeader; ContractMilestones; ContractActionBar; ContractTimeline; ContractDialogs; contractActions
 * Used by:
 *   - features/contracts/components/contracts-page.tsx
 */

import { openChatEventName } from '@/features/chat/utils/chat-data'
import type { ContractDetail, AmendmentView } from '@/shared/schemas'
import { ContractActionBar } from './contract-action-bar'
import { contractActions, currentMilestone, openAmendment, submittedMilestone, type ContractAction, freelancerCanAcceptEnd } from '../../utils/contract-actions'
import { ContractDialogs } from '../dialogs/contract-dialogs'
import { ContractHeader } from './contract-header'
import { ContractMilestones, ContractSubmissions } from './contract-milestones'
import { ContractTimeline } from './contract-timeline'
import { viewerRoleFor } from '../../utils/milestone-actions'
import { PanelFrame } from '../panel-frame'
import { useContractActions } from '../../hooks/use-contract-actions'
import { formatPipelineTime } from '@/features/hiring-pipeline/utils/format-time'
import { Button } from '@/shared/ui'
import { describeAmendment } from '@/features/contracts/utils/amendment-changes'

/**
 * One contract, in full: header with the four figures, the milestone steps, the current milestone with its buttons,
 * the open change request and end request, every submission, the review and the history.
 * The server decides every step: after a refused step (409) the contract is read again and the buttons follow; a
 * dialog whose step is no longer possible closes and a notice says why. Someone who is not on the contract (an
 * admin reading it) sees no buttons at all. Mount it with `key={contract.id}`.
 */
export function ContractPanel({ contract, viewerId, backHref }: { contract: ContractDetail; viewerId: number; backHref: string }) {
  const active = contract.status === 'ACTIVE'
  const role = viewerRoleFor(contract, viewerId)
  const party = role !== 'observer'
  const isClient = role === 'client'
  const other = isClient || !party ? contract.freelancer : contract.client

  const actions = contractActions(contract, viewerId)
  const can = (action: ContractAction) => actions.includes(action)
  const current = currentMilestone(contract)
  const submitted = submittedMilestone(contract)
  const amendment = openAmendment(contract)

  // Mutations, dialog state, and the stale-dialog check live in one hook so a successful step closes
  // its dialog in the same render batch as the cache update.
  const {
    dialog,
    dialogError,
    notice,
    pending,
    availableCredits,
    openDialog,
    closeDialog,
    runAction,
    sendReview,
    askToLower,
  } = useContractActions(contract, viewerId, can('fund'))

  function openChat() {
    window.dispatchEvent(new CustomEvent(openChatEventName, { detail: { userId: other.id } }))
  }

  return (
    <PanelFrame backHref={backHref} labelledBy={`contract-${contract.id}`}>
      <ContractHeader
        contract={contract}
        viewerId={viewerId}
        other={other}
        party={party}
        isClient={isClient}
        notice={notice}
        canReview={can('review')}
        pending={pending}
        onReview={() => openDialog({ type: 'review' })}
      />

      <ContractMilestones
        contract={contract}
        current={current}
        role={role}
        pending={pending}
        onOpenDialog={openDialog}
      />

      {amendment && active ? (
        <AmendmentCard
          amendment={amendment}
          contract={contract}
          viewerId={viewerId}
          pending={pending}
          onAccept={can('acceptAmendment') ? () => openDialog({ type: 'acceptAmendment', amendmentId: amendment.id }) : undefined}
          onDecline={can('declineAmendment') ? () => openDialog({ type: 'declineAmendment', amendmentId: amendment.id }) : undefined}
          onWithdraw={can('withdrawAmendment') ? () => openDialog({ type: 'withdrawAmendment', amendmentId: amendment.id }) : undefined}
        />
      ) : null}
      {active ? (
        <EndRequestCard
          contract={contract}
          viewerId={viewerId}
          pending={pending}
          onAccept={can('acceptEnd') ? () => openDialog({ type: 'acceptEnd' }) : undefined}
          onDecline={can('declineEnd') ? () => openDialog({ type: 'declineEnd' }) : undefined}
          onWithdraw={can('withdrawEnd') ? () => openDialog({ type: 'withdrawEnd' }) : undefined}
        />
      ) : null}

      {party ? (
        <ContractActionBar
          actions={actions}
          otherName={other.name}
          pending={pending}
          onOpenDialog={openDialog}
          onOpenChat={openChat}
        />
      ) : null}

      <ContractSubmissions contract={contract} />

      <h3 className="mt-6 font-display text-base font-medium">History</h3>
      <div className="mt-2"><ContractTimeline events={contract.events} /></div>

      <ContractDialogs
        contract={contract}
        other={other}
        isClient={isClient}
        submitted={submitted}
        dialog={dialog}
        dialogError={dialogError}
        pending={pending}
        availableCredits={availableCredits}
        canProposeAmendment={can('proposeAmendment')}
        onClose={closeDialog}
        onRunAction={runAction}
        onSendReview={sendReview}
        onAskToLower={askToLower}
      />
    </PanelFrame>
  )
}

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
