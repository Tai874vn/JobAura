'use client'

import { openChatEventName } from '@/features/chat/chat-data'
import type { ContractDetail } from '@/shared/schemas'
import { AmendmentCard } from './amendment-card'
import { ContractActionBar } from './contract-action-bar'
import {
  contractActions,
  currentMilestone,
  openAmendment,
  submittedMilestone,
  type ContractAction,
} from '../../utils/contract-actions'
import { ContractDialogs } from '../dialogs/contract-dialogs'
import { ContractHeader } from './contract-header'
import { ContractMilestones, ContractSubmissions } from './contract-milestones'
import { ContractTimeline } from './contract-timeline'
import { EndRequestCard } from './end-request-card'
import { viewerRoleFor } from '../../utils/milestone-actions'
import { PanelFrame } from '../panel-frame'
import { useContractActions } from '../../hooks/use-contract-actions'

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
