'use client'

import { MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { openChatEventName } from '@/features/chat/chat-data'
import { formatPipelineTime } from '@/features/hiring-pipeline/format-time'
import { runDialogAction } from '@/features/hiring-pipeline/run-dialog-action'
import { credits } from '@/shared/lib/credits'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ProposalDetail, VersionBody } from '@/shared/schemas'
import { Avatar, Badge, Button } from '@/shared/ui'
import { contractKeys, contractsApi } from './api'
import { ConfirmDialog } from './confirm-dialog'
import { ContractTimeline } from './contract-timeline'
import { expiresIn } from './contracts-selection'
import { CounterDialog } from './counter-dialog'
import { nextAction } from './next-action'
import { PanelFrame } from './panel-frame'
import { describeVersionChange } from './proposal-changes'
import { proposalActions } from './proposal-actions'
import { proposalLabel } from './status-labels'
import { useContractMutation } from './use-contract-mutation'
import { VersionView } from './version-view'

/** One thing the viewer can ask the server to do on this proposal. */
type Act =
  | { type: 'accept'; version: number }
  | { type: 'counter'; body: VersionBody }
  | { type: 'decline'; note?: string }
  | { type: 'withdraw' }

/** The dialog that is open. Accept remembers the version the person read, and sends exactly that number. */
type Dialog = { type: 'accept'; version: number } | { type: 'counter' } | { type: 'decline' } | { type: 'withdraw' }

const doneText: Record<Act['type'], string> = {
  accept: 'Proposal accepted. The contract has started.',
  counter: 'Counter-offer sent.',
  decline: 'Proposal declined.',
  withdraw: 'Proposal withdrawn.',
}

function run(id: number, act: Act): Promise<ProposalDetail> {
  switch (act.type) {
    case 'accept':
      return contractsApi.accept(id, act.version)
    case 'counter':
      return contractsApi.counter(id, act.body)
    case 'decline':
      return contractsApi.decline(id, act.note)
    case 'withdraw':
      return contractsApi.withdrawProposal(id)
  }
}

/** Is the dialog still something the viewer may do on the proposal as it is now? (After a refusal the proposal is read again.) */
function dialogAllowed(dialog: Dialog, proposal: ProposalDetail, viewerId: number): boolean {
  const allowed = proposalActions(proposal, viewerId)
  if (dialog.type === 'accept') return allowed.accept && dialog.version === proposal.latestVersion
  return allowed[dialog.type]
}

/**
 * One proposal, in full: header, whose turn it is, the latest version, the earlier ones, the actions and the history.
 * The server decides every step, so after a refused step (409) the proposal is read again and the buttons follow.
 * Mount it with `key={proposal.id}`, so dialogs never carry over to another proposal.
 * `onAccepted` is called with the new contract's id; the page then opens that contract.
 */
export function ProposalPanel({
  proposal,
  viewerId,
  backHref,
  contractHref,
  onAccepted,
}: {
  proposal: ProposalDetail
  viewerId: number
  backHref: string
  contractHref: (contractId: number) => string
  onAccepted: (contractId: number) => void
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  // A sentence kept on the panel when a dialog had to close because the proposal moved on.
  const [notice, setNotice] = useState<string | null>(null)
  const mutation = useContractMutation(contractKeys.proposal(proposal.id), (act: Act) => run(proposal.id, act), {
    // Every refusal is told on the screen itself (a dialog or the notice), never by a toast.
    quietErrors: () => true,
  })
  const pending = mutation.isPending

  const other = proposal.viewerRole === 'client' ? proposal.freelancer : proposal.client
  const allowed = proposalActions(proposal, viewerId)
  const action = nextAction(proposal, viewerId)
  const newestFirst = [...proposal.versions].reverse()
  const latest = newestFirst[0]
  const earlier = newestFirst.slice(1)
  const open = proposal.status === 'OPEN'

  // The server refused a step because the proposal changed. Once the fresh proposal no longer allows what the
  // dialog does, close it, so no stale button stays live. (React allows setting this component's own state while it renders.)
  if (dialog !== null && !dialogAllowed(dialog, proposal, viewerId)) {
    setNotice(dialogError ?? 'This proposal changed, so that step is no longer possible.')
    setDialog(null)
    setDialogError(null)
  }

  async function perform(act: Act) {
    setNotice(null)
    const detail = await mutation.mutateAsync(act)
    toast.success(doneText[act.type])
    if (act.type === 'accept' && detail.contractId !== null) onAccepted(detail.contractId)
  }
  function closeDialog() {
    setDialog(null)
    setDialogError(null)
  }
  async function fromDialog(act: Act) {
    setDialogError(null)
    const result = await runDialogAction(() => perform(act), (error) => getErrorMessage(error, 'Could not save this change. Please try again.'))
    if ('error' in result) setDialogError(result.error)
    else closeDialog()
  }
  function openChat() {
    window.dispatchEvent(new CustomEvent(openChatEventName, { detail: { userId: other.id } }))
  }

  const statusWord = proposalLabel(proposal, viewerId, other.name)

  return (
    <PanelFrame backHref={backHref} labelledBy={`proposal-${proposal.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={other.name} src={other.avatar} size="lg" />
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-medium">{other.name}</p>
          <p className="truncate text-sm text-muted">{proposal.viewerRole === 'client' ? 'Freelancer' : 'Client'} · proposal sent {formatPipelineTime(proposal.createdAt)}</p>
        </div>
        <Badge tone={open ? 'primary' : 'neutral'}>{statusWord}</Badge>
      </div>

      <h2 id={`proposal-${proposal.id}`} className="mt-4 break-words font-display text-xl font-medium leading-tight">
        <Link href={`/jobs/${proposal.job.id}`} className="hover:text-primary">{proposal.job.title}</Link>
      </h2>
      <p className="mt-1 text-sm text-muted">
        Version {proposal.latestVersion}
        {open ? ` · expires ${expiresIn(proposal.expiresAt)}` : null}
      </p>

      {notice ? <p role="alert" className="mt-4 break-words rounded-lg bg-danger/10 p-3 text-sm text-danger">{notice}</p> : null}

      {proposal.status === 'DECLINED' && proposal.declineNote ? (
        <p className="mt-4 break-words rounded-lg bg-surface-muted p-3 text-sm">Reason given: {proposal.declineNote}</p>
      ) : null}
      {proposal.status === 'ACCEPTED' && proposal.contractId !== null ? (
        <p className="mt-4 text-sm">
          <Link href={contractHref(proposal.contractId)} className="font-medium text-primary hover:underline">Open the contract</Link>
        </p>
      ) : null}
      {proposal.status === 'EXPIRED' ? <p className="mt-4 text-sm text-muted">Nobody answered in 7 days, so this proposal closed. Send a new one from the service page.</p> : null}

      {open ? (
        <p className={action.mine ? 'mt-3 text-sm font-semibold text-primary' : 'mt-3 text-sm text-muted'}>
          {action.mine ? 'It is your turn. Accept, counter or decline.' : `${action.label}.${allowed.withdraw ? ' You can withdraw your version.' : ''}`}
        </p>
      ) : null}

      {latest ? (
        <section className="mt-5" aria-label={`Version ${latest.number}`}>
          <h3 className="font-display text-base font-medium">Version {latest.number}{latest.authorId === viewerId ? ' (yours)' : ''}</h3>
          <ChangeList changes={describeVersionChange(newestFirst[1], latest)} />
          <div className="mt-2"><VersionView version={latest} /></div>
        </section>
      ) : null}

      {open && (allowed.accept || allowed.withdraw) ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {allowed.accept ? (
            <>
              <Button type="button" disabled={pending} onClick={() => setDialog({ type: 'accept', version: proposal.latestVersion })}>Accept</Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setDialog({ type: 'counter' })}>Counter</Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setDialog({ type: 'decline' })}>Decline</Button>
            </>
          ) : null}
          {allowed.withdraw ? (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setDialog({ type: 'withdraw' })}>Withdraw</Button>
          ) : null}
        </div>
      ) : null}
      <div className={open && (allowed.accept || allowed.withdraw) ? 'mt-2' : 'mt-5'}>
        <Button type="button" variant="ghost" size="sm" onClick={openChat}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Message {other.name.split(' ')[0]}
        </Button>
      </div>

      {earlier.length ? (
        <details className="mt-6 rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium">Earlier versions ({earlier.length})</summary>
          <ul className="divide-y divide-border border-t border-border">
            {earlier.map((version, i) => (
              <li key={version.id}>
                <details className="group">
                  <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 px-3 py-2.5 text-sm">
                    <span className="font-medium">Version {version.number}{version.authorId === viewerId ? ' (yours)' : ''}</span>
                    <span className="tabular-nums text-muted">{credits(version.total)}</span>
                  </summary>
                  <div className="px-3 pb-3">
                    <ChangeList changes={describeVersionChange(earlier[i + 1], version)} />
                    <div className="mt-2"><VersionView version={version} /></div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <h3 className="mt-6 font-display text-base font-medium">History</h3>
      <div className="mt-2"><ContractTimeline events={proposal.events} /></div>

      <ConfirmDialog
        open={dialog?.type === 'accept'}
        title="Accept this proposal?"
        description={`This starts a contract for ${credits(latest?.total ?? 0)} in ${latest?.milestones.length ?? 0} ${latest?.milestones.length === 1 ? 'milestone' : 'milestones'}. No credits move until the client funds a milestone.`}
        confirmLabel="Accept"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => dialog?.type === 'accept' && void fromDialog({ type: 'accept', version: dialog.version })}
      />
      <ConfirmDialog
        open={dialog?.type === 'decline'}
        title="Decline this proposal?"
        description={`${other.name} is told. A closed proposal cannot be opened again.`}
        confirmLabel="Decline"
        tone="danger"
        noteLabel="Reason"
        noteMaxLength={1000}
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={(note) => void fromDialog({ type: 'decline', note })}
      />
      <ConfirmDialog
        open={dialog?.type === 'withdraw'}
        title="Withdraw your version?"
        description={`${other.name} can no longer accept it. The proposal closes.`}
        confirmLabel="Withdraw"
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => void fromDialog({ type: 'withdraw' })}
      />
      {dialog?.type === 'counter' && latest ? (
        <CounterDialog
          latest={latest}
          pending={pending}
          error={dialogError}
          onClose={closeDialog}
          onSubmit={(body) => void fromDialog({ type: 'counter', body })}
        />
      ) : null}
    </PanelFrame>
  )
}

/** What a version changed, as a short list. Nothing is drawn for the first version. */
function ChangeList({ changes }: { changes: string[] }) {
  if (!changes.length) return null
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted" aria-label="What changed">
      {changes.map((change) => <li key={change} className="break-words">{change}</li>)}
    </ul>
  )
}
