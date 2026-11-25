'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Star } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { openChatEventName } from '@/features/chat/chat-data'
import { formatPipelineDay } from '@/features/hiring-pipeline/format-time'
import { runDialogAction } from '@/features/hiring-pipeline/run-dialog-action'
import { walletApi, walletKeys } from '@/features/wallet/api'
import { reportNonFatalError } from '@/shared/api/query-client'
import { queryKeys } from '@/shared/api/query-keys'
import { credits } from '@/shared/lib/credits'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import type { ContractDetail, EndChoice, MilestoneView } from '@/shared/schemas'
import { Avatar, Badge, Button } from '@/shared/ui'
import { contractKeys, contractsApi } from './api'
import { AmendmentCard } from './amendment-card'
import { lowerAmountFrom, type AmendmentBody } from './amendment-changes'
import { AmendmentDialog } from './amendment-dialog'
import { ConfirmDialog } from './confirm-dialog'
import {
  contractActions,
  currentMilestone,
  dialogStillAllowed,
  milestoneClock,
  openAmendment,
  submittedMilestone,
  type ContractAction,
  type ContractDialog,
} from './contract-actions'
import { ContractTimeline } from './contract-timeline'
import { EndDialog } from './end-dialog'
import { EndRequestCard } from './end-request-card'
import { FundError, FundWaysOut } from './fund-error'
import { MilestoneStepper } from './milestone-stepper'
import { nextAction } from './next-action'
import { PanelFrame } from './panel-frame'
import { refreshServicePageAfterReview } from './refresh-service-page'
import { ReviewDialog } from './review-dialog'
import { contractLabel, endReasonLine, milestoneLabel } from './status-labels'
import { SubmissionCard } from './submission-card'
import { SubmitWorkDialog, type WorkBody } from './submit-work-dialog'
import { useContractMutation } from './use-contract-mutation'

/** One thing the viewer can ask the server to do on this contract. */
type Act =
  | { type: 'fund' | 'approve'; milestoneId: number }
  | { type: 'submit'; milestoneId: number; body: WorkBody }
  | { type: 'requestChanges'; milestoneId: number; note: string }
  | { type: 'proposeAmendment'; body: AmendmentBody & { note?: string } }
  | { type: 'acceptAmendment' | 'withdrawAmendment'; amendmentId: number }
  | { type: 'declineAmendment'; amendmentId: number; note?: string }
  | { type: 'requestEnd'; note?: string; choice?: EndChoice }
  | { type: 'acceptEnd'; choice?: EndChoice }
  | { type: 'declineEnd' | 'withdrawEnd' | 'endNow' }

const doneText: Record<Act['type'], string> = {
  fund: 'Milestone funded. The freelancer can start.',
  submit: 'Work submitted. The client is told.',
  requestChanges: 'Changes requested.',
  approve: 'Milestone approved. The credits are released.',
  proposeAmendment: 'Change request sent.',
  acceptAmendment: 'Change request accepted.',
  declineAmendment: 'Change request declined.',
  withdrawAmendment: 'Change request withdrawn.',
  requestEnd: 'End request sent.',
  acceptEnd: 'Contract ended.',
  declineEnd: 'End request declined.',
  withdrawEnd: 'End request withdrawn.',
  endNow: 'Contract ended.',
}

function run(contractId: number, act: Act): Promise<ContractDetail> {
  switch (act.type) {
    case 'fund':
      return contractsApi.fund(act.milestoneId)
    case 'submit':
      return contractsApi.submit(act.milestoneId, act.body)
    case 'requestChanges':
      return contractsApi.requestChanges(act.milestoneId, act.note)
    case 'approve':
      return contractsApi.approve(act.milestoneId)
    case 'proposeAmendment':
      return contractsApi.proposeAmendment(contractId, act.body)
    case 'acceptAmendment':
      return contractsApi.acceptAmendment(act.amendmentId)
    case 'declineAmendment':
      return contractsApi.declineAmendment(act.amendmentId, act.note)
    case 'withdrawAmendment':
      return contractsApi.withdrawAmendment(act.amendmentId)
    case 'requestEnd':
      return contractsApi.requestEnd(contractId, { note: act.note, submittedChoice: act.choice })
    case 'acceptEnd':
      return contractsApi.acceptEnd(contractId, act.choice)
    case 'declineEnd':
      return contractsApi.declineEnd(contractId)
    case 'withdrawEnd':
      return contractsApi.withdrawEnd(contractId)
    case 'endNow':
      return contractsApi.endNow(contractId)
  }
}

/** The time now, read again every minute only while the contract is active (completed/ended contracts need no timer). */
function useNow(active: boolean): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}

/** Every submission of every milestone, newest first, each with its milestone. */
function allSubmissions(c: ContractDetail) {
  return c.milestones
    .flatMap((m) => m.submissions.map((s) => ({ milestone: m, submission: s })))
    .sort((a, b) => new Date(b.submission.createdAt).getTime() - new Date(a.submission.createdAt).getTime())
}

const milestoneName = (m: MilestoneView) => `Milestone ${m.position}: ${m.title}`

/**
 * One contract, in full: header with the four figures, the milestone steps, the current milestone with its buttons,
 * the open change request and end request, every submission, the review and the history.
 * The server decides every step: after a refused step (409) the contract is read again and the buttons follow; a
 * dialog whose step is no longer possible closes and a notice says why. Someone who is not on the contract (an
 * admin reading it) sees no buttons at all. Mount it with `key={contract.id}`.
 */
export function ContractPanel({ contract, viewerId, backHref }: { contract: ContractDetail; viewerId: number; backHref: string }) {
  const queryClient = useQueryClient()
  const detailKey = contractKeys.contract(contract.id, viewerId)
  const [dialog, setDialog] = useState<ContractDialog | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  // A sentence kept on the panel when a dialog had to close because the contract moved on.
  const [notice, setNotice] = useState<string | null>(null)
  const active = contract.status === 'ACTIVE'
  const now = useNow(active)

  function closeDialog() {
    setDialog(null)
    setDialogError(null)
  }

  const mutation = useContractMutation(detailKey, (act: Act) => run(contract.id, act), {
    // Every step runs from a dialog, which shows the refusal itself.
    quietErrors: () => true,
    // Close the dialog in the same render batch as setQueryData so our own success never triggers the stale-dialog notice.
    onSuccess: closeDialog,
  })
  const review = useMutation({
    mutationFn: (input: { rating: number; content: string }) => contractsApi.review({ contractId: contract.id, ...input }),
    onSuccess: (_answer, input) => {
      closeDialog()
      // The answer is the comment, not the contract: show the review at once, then read the contract again.
      queryClient.setQueryData<ContractDetail>(detailKey, (old) => (old ? { ...old, canReview: false, review: { id: 0, ...input } } : old))
      void queryClient.invalidateQueries({ queryKey: ['contracts'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments })
      // The service page keeps a 5-minute server cache; clear it so the review shows there at once.
      // A failure here only means the old list shows a little longer, so report it in the background.
      void refreshServicePageAfterReview(contract.id).catch((error) => reportNonFatalError(error, 'cache:revalidate-service'))
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: detailKey }),
  })
  const pending = mutation.isPending || review.isPending

  const actions = contractActions(contract, viewerId)
  const can = (a: ContractAction) => actions.includes(a)
  const party = viewerId === contract.client.id || viewerId === contract.freelancer.id
  const isClient = viewerId === contract.client.id
  const other = isClient || !party ? contract.freelancer : contract.client
  const current = currentMilestone(contract)
  const submitted = submittedMilestone(contract)
  const amendment = openAmendment(contract)
  const reason = endReasonLine(contract)
  const action = nextAction(contract, viewerId)
  const submissions = allSubmissions(contract)
  const clock = current && active ? milestoneClock(contract, current, now) : null

  // The balance, for "after funding" in the fund dialog. Read only when the client can fund.
  const wallet = useQuery({ queryKey: walletKeys.summary(viewerId), queryFn: walletApi.summary, enabled: can('fund'), staleTime: 15_000 })

  // The contract changed under an open dialog (the other side or the deadline job acted): close it and say so.
  // Not while a step is running: our own success closes the dialog in onSuccess right beside setQueryData.
  if (dialog !== null && !pending && !dialogStillAllowed(dialog, contract, viewerId)) {
    setNotice(dialogError ?? 'This contract changed, so that step is no longer possible.')
    setDialog(null)
    setDialogError(null)
  }

  function open(next: ContractDialog) {
    setNotice(null)
    setDialogError(null)
    setDialog(next)
  }
  async function fromDialog(act: Act) {
    setDialogError(null)
    const result = await runDialogAction(
      () => mutation.mutateAsync(act),
      (error) => getErrorMessage(error, 'Could not save this change. Please try again.'),
    )
    if ('error' in result) {
      setDialogError(result.error)
      return
    }
    toast.success(doneText[act.type])
    closeDialog()
  }
  async function sendReview(input: { rating: number; content: string }) {
    setDialogError(null)
    const result = await runDialogAction(
      () => review.mutateAsync(input),
      (error) => getErrorMessage(error, 'Could not send the review. Please try again.'),
    )
    if ('error' in result) {
      setDialogError(result.error)
      return
    }
    toast.success('Review sent. Thank you.')
    closeDialog()
  }
  function openChat() {
    window.dispatchEvent(new CustomEvent(openChatEventName, { detail: { userId: other.id } }))
  }
  /** From the fund dialog: open the change-request editor with that milestone's amount lowered to what the client has. */
  function askToLower(m: MilestoneView) {
    const have = lowerAmountFrom(dialogError) ?? wallet.data?.available ?? null
    const amount = have !== null && have >= 1 && have < m.amount ? have : null
    open({ type: 'proposeAmendment', preset: amount !== null ? { milestoneId: m.id, amount } : undefined })
  }

  const dialogMilestone = dialog && 'milestoneId' in dialog ? (contract.milestones.find((m) => m.id === dialog.milestoneId) ?? null) : null
  const available = wallet.data?.available
  const fundShort = dialogMilestone !== null && available !== undefined && available < dialogMilestone.amount
  const lowerAmount = dialogMilestone && can('proposeAmendment') ? () => askToLower(dialogMilestone) : undefined
  const figures = [
    ['Total', contract.total],
    ['Paid', contract.paid],
    ['Held', contract.held],
    ['Remaining', contract.remaining],
  ] as const

  return (
    <PanelFrame backHref={backHref} labelledBy={`contract-${contract.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={other.name} src={other.avatar} size="lg" />
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-medium">{party ? other.name : `${contract.client.name} and ${contract.freelancer.name}`}</p>
          <p className="truncate text-sm text-muted">{party ? (isClient ? 'Freelancer' : 'Client') : 'Client and freelancer'}</p>
        </div>
        <Badge tone={active ? 'primary' : 'neutral'}>{contractLabel(contract)}</Badge>
      </div>

      <h2 id={`contract-${contract.id}`} className="mt-4 break-words font-display text-xl font-medium leading-tight">
        <Link href={`/jobs/${contract.job.id}`} className="hover:text-primary">{contract.title}</Link>
      </h2>
      <p className="mt-1 text-sm text-muted">
        Deadline {formatPipelineDay(contract.deadline)}
        {contract.imported ? ' · copied from an earlier hire' : null}
      </p>
      {reason ? <p className="mt-1 text-sm font-medium">{reason}</p> : null}
      {party && action.label ? <p className={action.mine ? 'mt-2 text-sm font-semibold text-primary' : 'mt-2 text-sm text-muted'}>{action.label}</p> : null}
      {party ? null : (
        <p className="mt-2 rounded-lg bg-surface-muted p-3 text-sm">You are reading this contract as an admin. Only the client and the freelancer can act on it.</p>
      )}

      {notice ? <p role="alert" className="mt-4 break-words rounded-lg bg-danger/10 p-3 text-sm text-danger">{notice}</p> : null}

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label} className="min-w-0 bg-surface p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium tabular-nums">{credits(value)}</dd>
          </div>
        ))}
      </dl>

      {contract.review ? (
        <section className="mt-4 rounded-lg border border-border p-4" aria-label="Review">
          <h3 className="font-display text-base font-medium">{isClient ? 'Your review' : `${contract.client.name}'s review`}</h3>
          <p className="mt-1 flex gap-0.5" role="img" aria-label={`${contract.review.rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} aria-hidden className={cn('h-4 w-4', n <= (contract.review?.rating ?? 0) ? 'fill-rating text-rating' : 'text-border')} />
            ))}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{contract.review.content}</p>
        </section>
      ) : null}
      {can('review') ? (
        <div className="mt-4 rounded-lg bg-surface-muted p-4">
          <p className="text-sm">How did it go? Your review helps other clients choose.</p>
          <Button type="button" className="mt-2" disabled={pending} onClick={() => open({ type: 'review' })}>Leave a review</Button>
        </div>
      ) : null}

      <h3 className="mt-6 font-display text-base font-medium">Milestones</h3>
      <div className="mt-2"><MilestoneStepper milestones={contract.milestones} currentId={active ? current?.id : null} /></div>

      {current && active ? (
        <section className="mt-4 rounded-lg border border-primary/40 p-4" aria-label="Current milestone">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="min-w-0 break-words font-display text-base font-medium">{milestoneName(current)}</h3>
            <p className="text-sm text-muted">{milestoneLabel(current.status)}</p>
          </div>
          {current.description ? <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{current.description}</p> : null}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-medium tabular-nums">{credits(current.amount)}</span>
            <span>Due {formatPipelineDay(current.dueDate)}</span>
          </p>
          {clock ? <p className={cn('mt-1 text-sm', clock.warn ? 'font-medium text-danger' : 'text-muted')}>{clock.text}</p> : null}

          {can('fund') || can('submit') || can('requestChanges') || can('approve') ? (
            <div className="mt-3 flex flex-wrap gap-2 pr-24 lg:pr-0">
              {can('fund') ? (
                <Button type="button" className="h-auto min-h-10 whitespace-normal py-2" disabled={pending} onClick={() => open({ type: 'fund', milestoneId: current.id })}>
                  Fund milestone {current.position} ({credits(current.amount)})
                </Button>
              ) : null}
              {can('submit') ? <Button type="button" disabled={pending} onClick={() => open({ type: 'submit', milestoneId: current.id })}>Submit work</Button> : null}
              {can('approve') ? (
                <Button type="button" className="h-auto min-h-10 whitespace-normal py-2" disabled={pending} onClick={() => open({ type: 'approve', milestoneId: current.id })}>
                  Approve and release {credits(current.amount)}
                </Button>
              ) : null}
              {can('requestChanges') ? (
                <Button type="button" variant="secondary" disabled={pending} onClick={() => open({ type: 'requestChanges', milestoneId: current.id })}>Request changes</Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {amendment && active ? (
        <AmendmentCard
          amendment={amendment}
          contract={contract}
          viewerId={viewerId}
          pending={pending}
          onAccept={can('acceptAmendment') ? () => open({ type: 'acceptAmendment', amendmentId: amendment.id }) : undefined}
          onDecline={can('declineAmendment') ? () => open({ type: 'declineAmendment', amendmentId: amendment.id }) : undefined}
          onWithdraw={can('withdrawAmendment') ? () => open({ type: 'withdrawAmendment', amendmentId: amendment.id }) : undefined}
        />
      ) : null}
      {active ? (
        <EndRequestCard
          contract={contract}
          viewerId={viewerId}
          pending={pending}
          onAccept={can('acceptEnd') ? () => open({ type: 'acceptEnd' }) : undefined}
          onDecline={can('declineEnd') ? () => open({ type: 'declineEnd' }) : undefined}
          onWithdraw={can('withdrawEnd') ? () => open({ type: 'withdrawEnd' }) : undefined}
        />
      ) : null}

      {party ? (
        <div className="mt-4 flex flex-wrap gap-2 pr-24 lg:pr-0">
          {can('proposeAmendment') ? (
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => open({ type: 'proposeAmendment' })}>Propose a change</Button>
          ) : null}
          {can('endNow') ? <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => open({ type: 'endNow' })}>End contract</Button> : null}
          {can('requestEnd') ? <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => open({ type: 'requestEnd' })}>Ask to end</Button> : null}
          {can('message') ? (
            <Button type="button" variant="ghost" size="sm" onClick={openChat}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Message {other.name.split(' ')[0]}
            </Button>
          ) : null}
        </div>
      ) : null}

      <h3 className="mt-6 font-display text-base font-medium">Submitted work</h3>
      {submissions.length ? (
        <ul className="mt-2 space-y-3">
          {submissions.map(({ milestone, submission }) => (
            <li key={submission.id} className="min-w-0">
              <p className="mb-1 break-words text-xs font-medium text-muted">{milestoneName(milestone)}</p>
              <SubmissionCard submission={submission} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">No work submitted yet.</p>
      )}

      <h3 className="mt-6 font-display text-base font-medium">History</h3>
      <div className="mt-2"><ContractTimeline events={contract.events} /></div>

      <ConfirmDialog
        open={dialog?.type === 'fund' && dialogMilestone !== null}
        title={`Fund milestone ${dialogMilestone?.position ?? ''}?`}
        description={`${credits(dialogMilestone?.amount ?? 0)} leave your balance and are held until you approve the work. ${contract.freelancer.name} can start once it is funded.`}
        confirmLabel={`Fund ${credits(dialogMilestone?.amount ?? 0)}`}
        pending={pending}
        onCancel={closeDialog}
        onConfirm={() => dialogMilestone && void fromDialog({ type: 'fund', milestoneId: dialogMilestone.id })}
      >
        {available !== undefined && dialogMilestone ? (
          fundShort ? (
            <div className="mt-3">
              <p className="text-sm text-danger">You have {credits(available)}; this milestone needs {credits(dialogMilestone.amount)}.</p>
              {dialogError ? null : <FundWaysOut onLowerAmount={lowerAmount} />}
            </div>
          ) : (
            <p className="mt-3 text-sm">
              Your balance: {credits(available)} · after funding: <span className="font-medium">{credits(available - dialogMilestone.amount)}</span>
            </p>
          )
        ) : null}
        {dialogError ? <FundError message={dialogError} onLowerAmount={lowerAmount} /> : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog?.type === 'approve' && dialogMilestone !== null}
        title={`Approve milestone ${dialogMilestone?.position ?? ''}?`}
        description={`${credits(dialogMilestone?.amount ?? 0)} are released to ${contract.freelancer.name} now. This cannot be undone.`}
        confirmLabel={`Approve and release ${credits(dialogMilestone?.amount ?? 0)}`}
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => dialogMilestone && void fromDialog({ type: 'approve', milestoneId: dialogMilestone.id })}
      />
      <ConfirmDialog
        open={dialog?.type === 'requestChanges' && dialogMilestone !== null}
        title="Request changes"
        description={`Say what should change. ${contract.freelancer.name} then sends the work again for this milestone.`}
        confirmLabel="Request changes"
        noteLabel="What should change"
        noteRequired
        noteMaxLength={2000}
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={(note) => dialogMilestone && note && void fromDialog({ type: 'requestChanges', milestoneId: dialogMilestone.id, note })}
      />
      {dialog?.type === 'submit' && dialogMilestone ? (
        <SubmitWorkDialog
          milestoneLabel={milestoneName(dialogMilestone)}
          pending={pending}
          error={dialogError}
          onClose={closeDialog}
          onSubmit={(body) => void fromDialog({ type: 'submit', milestoneId: dialogMilestone.id, body })}
        />
      ) : null}

      {dialog?.type === 'proposeAmendment' ? (
        <AmendmentDialog
          contract={contract}
          otherName={other.name}
          preset={dialog.preset}
          pending={pending}
          error={dialogError}
          onClose={closeDialog}
          onSubmit={(body) => void fromDialog({ type: 'proposeAmendment', body })}
        />
      ) : null}
      <ConfirmDialog
        open={dialog?.type === 'acceptAmendment'}
        title="Accept the change request?"
        description="The changes apply at once: dates, amounts, new milestones and the deadline."
        confirmLabel="Accept"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => dialog?.type === 'acceptAmendment' && void fromDialog({ type: 'acceptAmendment', amendmentId: dialog.amendmentId })}
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
        onCancel={closeDialog}
        onConfirm={(note) => dialog?.type === 'declineAmendment' && void fromDialog({ type: 'declineAmendment', amendmentId: dialog.amendmentId, note })}
      />
      <ConfirmDialog
        open={dialog?.type === 'withdrawAmendment'}
        title="Withdraw your change request?"
        description="The contract stays as it is. You can send a new one later."
        confirmLabel="Withdraw"
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => dialog?.type === 'withdrawAmendment' && void fromDialog({ type: 'withdrawAmendment', amendmentId: dialog.amendmentId })}
      />

      <ConfirmDialog
        open={dialog?.type === 'endNow'}
        title="End the contract?"
        description="No credits are held, so you can end it now. Milestones not funded are cancelled; paid milestones stay paid. This cannot be undone."
        confirmLabel="End contract"
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => void fromDialog({ type: 'endNow' })}
      />
      {dialog?.type === 'requestEnd' || dialog?.type === 'acceptEnd' ? (
        <EndDialog
          mode={dialog.type === 'requestEnd' ? 'request' : 'accept'}
          otherName={other.name}
          submittedWork={isClient && submitted ? `${milestoneName(submitted)} · ${credits(submitted.amount)}` : null}
          pending={pending}
          error={dialogError}
          onClose={closeDialog}
          onConfirm={({ note, choice }) =>
            void fromDialog(dialog.type === 'requestEnd' ? { type: 'requestEnd', note, choice } : { type: 'acceptEnd', choice })
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
        onCancel={closeDialog}
        onConfirm={() => void fromDialog({ type: 'declineEnd' })}
      />
      <ConfirmDialog
        open={dialog?.type === 'withdrawEnd'}
        title="Withdraw your end request?"
        description="The contract goes on as before."
        confirmLabel="Withdraw"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => void fromDialog({ type: 'withdrawEnd' })}
      />

      {dialog?.type === 'review' ? (
        <ReviewDialog freelancerName={contract.freelancer.name} pending={pending} error={dialogError} onClose={closeDialog} onSubmit={(input) => void sendReview(input)} />
      ) : null}
    </PanelFrame>
  )
}
