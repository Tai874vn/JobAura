'use client'

/**
 * Groups and renders all confirmation and form dialogs for a contract on /contracts: milestones, change requests, ending the contract, and reviews.
 * Also displays credit balance checks and low-balance actions inside the fund milestone dialog.
 *
 * Calls: ConfirmDialog; SubmitWorkDialog; AmendmentDialog; EndDialog; ReviewDialog; creditsShortage; milestoneName; credits
 * Used by:
 *   - features/contracts/components/contract/contract-panel.tsx
 */

import { credits } from '@/shared/lib/credits'
import type { ContractDetail, MilestoneView, PersonSummary } from '@/shared/schemas'
import { AmendmentDialog } from './amendment-dialog'
import { ConfirmDialog } from './confirm-dialog'
import type { ContractDialog } from '../../utils/contract-actions'
import { milestoneName } from '../contract/contract-milestones'
import { EndDialog } from './end-dialog'
import { ReviewDialog } from './review-dialog'
import { SubmitWorkDialog } from './submit-work-dialog'
import type { ContractAct } from '../../hooks/use-contract-actions'
import { Button, ButtonLink } from '@/shared/ui'
import { creditsShortage } from '@/features/contracts/utils/amendment-changes'

type DialogsProps = {
  contract: ContractDetail
  other: PersonSummary
  isClient: boolean
  submitted: MilestoneView | null
  dialog: ContractDialog | null
  dialogError: string | null
  pending: boolean
  availableCredits: number | undefined
  canProposeAmendment: boolean
  onClose: () => void
  onRunAction: (act: ContractAct) => Promise<void>
  onSendReview: (input: { rating: number; content: string }) => Promise<void>
  onAskToLower: (milestone: MilestoneView) => void
}

/** All confirmation and form dialogs for a contract, grouped by topic so each group stays small. */
export function ContractDialogs({
  contract,
  other,
  isClient,
  submitted,
  dialog,
  dialogError,
  pending,
  availableCredits,
  canProposeAmendment,
  onClose,
  onRunAction,
  onSendReview,
  onAskToLower,
}: DialogsProps) {
  const dialogMilestone =
    dialog && 'milestoneId' in dialog
      ? (contract.milestones.find((m) => m.id === dialog.milestoneId) ?? null)
      : null

  return (
    <>
      <MilestoneDialogs
        freelancerName={contract.freelancer.name}
        dialog={dialog}
        dialogMilestone={dialogMilestone}
        dialogError={dialogError}
        pending={pending}
        availableCredits={availableCredits}
        canProposeAmendment={canProposeAmendment}
        onClose={onClose}
        onRunAction={onRunAction}
        onAskToLower={onAskToLower}
      />
      <AmendmentDialogs
        contract={contract}
        otherName={other.name}
        dialog={dialog}
        dialogError={dialogError}
        pending={pending}
        onClose={onClose}
        onRunAction={onRunAction}
      />
      <EndContractDialogs
        otherName={other.name}
        isClient={isClient}
        submitted={submitted}
        dialog={dialog}
        dialogError={dialogError}
        pending={pending}
        onClose={onClose}
        onRunAction={onRunAction}
      />
      {dialog?.type === 'review' ? (
        <ReviewDialog
          freelancerName={contract.freelancer.name}
          pending={pending}
          error={dialogError}
          onClose={onClose}
          onSubmit={(input) => void onSendReview(input)}
        />
      ) : null}
    </>
  )
}

function MilestoneDialogs({
  freelancerName,
  dialog,
  dialogMilestone,
  dialogError,
  pending,
  availableCredits,
  canProposeAmendment,
  onClose,
  onRunAction,
  onAskToLower,
}: {
  freelancerName: string
  dialog: ContractDialog | null
  dialogMilestone: MilestoneView | null
  dialogError: string | null
  pending: boolean
  availableCredits: number | undefined
  canProposeAmendment: boolean
  onClose: () => void
  onRunAction: (act: ContractAct) => Promise<void>
  onAskToLower: (milestone: MilestoneView) => void
}) {
  const fundShort = dialogMilestone !== null && availableCredits !== undefined && availableCredits < dialogMilestone.amount
  const lowerAmount = dialogMilestone && canProposeAmendment ? () => onAskToLower(dialogMilestone) : undefined

  return (
    <>
      <ConfirmDialog
        open={dialog?.type === 'fund' && dialogMilestone !== null}
        title={`Fund milestone ${dialogMilestone?.position ?? ''}?`}
        description={`${credits(dialogMilestone?.amount ?? 0)} leave your balance and are held until you approve the work. ${freelancerName} can start once it is funded.`}
        confirmLabel={`Fund ${credits(dialogMilestone?.amount ?? 0)}`}
        pending={pending}
        onCancel={onClose}
        onConfirm={() => dialogMilestone && void onRunAction({ type: 'fund', milestoneId: dialogMilestone.id })}
      >
        {availableCredits !== undefined && dialogMilestone ? (
          fundShort ? (
            <div className="mt-3">
              <p className="text-sm text-danger">You have {credits(availableCredits)}; this milestone needs {credits(dialogMilestone.amount)}.</p>
              {dialogError ? null : <FundWaysOut onLowerAmount={lowerAmount} />}
            </div>
          ) : (
            <p className="mt-3 text-sm">
              Your balance: {credits(availableCredits)} · after funding: <span className="font-medium">{credits(availableCredits - dialogMilestone.amount)}</span>
            </p>
          )
        ) : null}
        {dialogError ? <FundError message={dialogError} onLowerAmount={lowerAmount} /> : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog?.type === 'approve' && dialogMilestone !== null}
        title={`Approve milestone ${dialogMilestone?.position ?? ''}?`}
        description={`${credits(dialogMilestone?.amount ?? 0)} are released to ${freelancerName} now. This cannot be undone.`}
        confirmLabel={`Approve and release ${credits(dialogMilestone?.amount ?? 0)}`}
        pending={pending}
        error={dialogError}
        onCancel={onClose}
        onConfirm={() => dialogMilestone && void onRunAction({ type: 'approve', milestoneId: dialogMilestone.id })}
      />
      <ConfirmDialog
        open={dialog?.type === 'requestChanges' && dialogMilestone !== null}
        title="Request changes"
        description={`Say what should change. ${freelancerName} then sends the work again for this milestone.`}
        confirmLabel="Request changes"
        noteLabel="What should change"
        noteRequired
        noteMaxLength={2000}
        pending={pending}
        error={dialogError}
        onCancel={onClose}
        onConfirm={(note) => dialogMilestone && note && void onRunAction({ type: 'requestChanges', milestoneId: dialogMilestone.id, note })}
      />
      {dialog?.type === 'submit' && dialogMilestone ? (
        <SubmitWorkDialog
          milestoneLabel={milestoneName(dialogMilestone)}
          pending={pending}
          error={dialogError}
          onClose={onClose}
          onSubmit={(body) => void onRunAction({ type: 'submit', milestoneId: dialogMilestone.id, body })}
        />
      ) : null}
    </>
  )
}

function AmendmentDialogs({
  contract,
  otherName,
  dialog,
  dialogError,
  pending,
  onClose,
  onRunAction,
}: {
  contract: ContractDetail
  otherName: string
  dialog: ContractDialog | null
  dialogError: string | null
  pending: boolean
  onClose: () => void
  onRunAction: (act: ContractAct) => Promise<void>
}) {
  return (
    <>
      {dialog?.type === 'proposeAmendment' ? (
        <AmendmentDialog
          contract={contract}
          otherName={otherName}
          preset={dialog.preset}
          pending={pending}
          error={dialogError}
          onClose={onClose}
          onSubmit={(body) => void onRunAction({ type: 'proposeAmendment', body })}
        />
      ) : null}
      <ConfirmDialog
        open={dialog?.type === 'acceptAmendment'}
        title="Accept the change request?"
        description="The changes apply at once: dates, amounts, new milestones and the deadline."
        confirmLabel="Accept"
        pending={pending}
        error={dialogError}
        onCancel={onClose}
        onConfirm={() => dialog?.type === 'acceptAmendment' && void onRunAction({ type: 'acceptAmendment', amendmentId: dialog.amendmentId })}
      />
      <ConfirmDialog
        open={dialog?.type === 'declineAmendment'}
        title="Decline the change request?"
        description="The contract stays as it is."
        confirmLabel="Decline"
        tone="danger"
        noteLabel="Reason"
        noteMaxLength={1000}
        pending={pending}
        error={dialogError}
        onCancel={onClose}
        onConfirm={(note) => dialog?.type === 'declineAmendment' && void onRunAction({ type: 'declineAmendment', amendmentId: dialog.amendmentId, note })}
      />
      <ConfirmDialog
        open={dialog?.type === 'withdrawAmendment'}
        title="Withdraw your change request?"
        description="The contract stays as it is. You can send a new one later."
        confirmLabel="Withdraw"
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={onClose}
        onConfirm={() => dialog?.type === 'withdrawAmendment' && void onRunAction({ type: 'withdrawAmendment', amendmentId: dialog.amendmentId })}
      />
    </>
  )
}

function EndContractDialogs({
  otherName,
  isClient,
  submitted,
  dialog,
  dialogError,
  pending,
  onClose,
  onRunAction,
}: {
  otherName: string
  isClient: boolean
  submitted: MilestoneView | null
  dialog: ContractDialog | null
  dialogError: string | null
  pending: boolean
  onClose: () => void
  onRunAction: (act: ContractAct) => Promise<void>
}) {
  return (
    <>
      <ConfirmDialog
        open={dialog?.type === 'endNow'}
        title="End the contract?"
        description="No credits are held, so you can end it now. Milestones not funded are cancelled; paid milestones stay paid. This cannot be undone."
        confirmLabel="End contract"
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={onClose}
        onConfirm={() => void onRunAction({ type: 'endNow' })}
      />
      {dialog?.type === 'requestEnd' || dialog?.type === 'acceptEnd' ? (
        <EndDialog
          mode={dialog.type === 'requestEnd' ? 'request' : 'accept'}
          otherName={otherName}
          submittedWork={isClient && submitted ? `${milestoneName(submitted)} · ${credits(submitted.amount)}` : null}
          pending={pending}
          error={dialogError}
          onClose={onClose}
          onConfirm={({ note, choice }) =>
            void onRunAction(dialog.type === 'requestEnd' ? { type: 'requestEnd', note, choice } : { type: 'acceptEnd', choice })
          }
        />
      ) : null}
      <ConfirmDialog
        open={dialog?.type === 'declineEnd'}
        title="Decline the end request?"
        description="The contract goes on as before."
        confirmLabel="Decline"
        pending={pending}
        error={dialogError}
        onCancel={onClose}
        onConfirm={() => void onRunAction({ type: 'declineEnd' })}
      />
      <ConfirmDialog
        open={dialog?.type === 'withdrawEnd'}
        title="Withdraw your end request?"
        description="The contract goes on as before."
        confirmLabel="Withdraw"
        pending={pending}
        error={dialogError}
        onCancel={onClose}
        onConfirm={() => void onRunAction({ type: 'withdrawEnd' })}
      />
    </>
  )
}

/** The two ways out when the client has too few credits: `Top up` (the wallet page) and `Ask to lower the amount`. */
export function FundWaysOut({ onLowerAmount }: { onLowerAmount?: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <ButtonLink href="/wallet" size="sm">Top up</ButtonLink>
      {onLowerAmount ? (
        <Button type="button" variant="secondary" size="sm" onClick={onLowerAmount}>Ask to lower the amount</Button>
      ) : null}
    </div>
  )
}

/**
 * What the fund dialog shows when the server refused. For the "too few credits" sentence it adds the two ways out
 * (`onLowerAmount` opens the change-request editor started on that milestone; leave it out when a change request
 * cannot be sent now). Any other refusal shows the sentence alone.
 */
export function FundError({ message, onLowerAmount }: { message: string; onLowerAmount?: () => void }) {
  return (
    <div className="mt-4">
      <p role="alert" className="break-words text-sm text-danger">{message}</p>
      {creditsShortage(message) ? <FundWaysOut onLowerAmount={onLowerAmount} /> : null}
    </div>
  )
}
