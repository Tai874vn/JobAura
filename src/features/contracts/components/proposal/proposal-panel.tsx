'use client'




import { MessageSquare, X } from 'lucide-react'
import Link from 'next/link'
import { useState, useId } from 'react'
import { toast } from 'sonner'
import { openChatEventName } from '@/features/chat/utils/chat-data'
import { formatPipelineTime, formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'
import { runDialogAction } from '@/features/hiring-pipeline/utils/run-dialog-action'
import { credits } from '@/shared/lib/credits'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ProposalDetail, VersionBody, ProposalVersionView } from '@/shared/schemas'
import { Avatar, Badge, Button, DialogPortal, useDialogFocus } from '@/shared/ui'
import { contractKeys, contractsApi } from '../../api'
import { ConfirmDialog } from '../dialogs/confirm-dialog'
import { ContractTimeline } from '../contract/contract-timeline'
import { expiresIn } from '../../utils/contracts-selection'
import { nextAction } from '../../utils/next-action'
import { PanelFrame } from '../panel-frame'
import { proposalLabel } from '../../utils/status-labels'
import { useContractMutation } from '../../hooks/use-contract-mutation'
import { VersionView } from './version-view'
import { ProposalEditor } from '@/features/contracts/components/proposal/proposal-editor'
import { fromVersion } from '@/features/contracts/utils/proposal-editor-model'

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
  function closeDialog() {
    setDialog(null)
    setDialogError(null)
  }
  const mutation = useContractMutation(contractKeys.proposal(proposal.id, viewerId), (act: Act) => run(proposal.id, act), {
    // Every refusal is told on the screen itself (a dialog or the notice), never by a toast.
    quietErrors: () => true,
    // Close the dialog in the same render batch as setQueryData so our own success never triggers the stale-dialog notice.
    onSuccess: closeDialog,
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
  // dialog does, close it, so no stale button stays live. Guard with !pending so in-flight mutations never flash this.
  if (dialog !== null && !pending && !dialogAllowed(dialog, proposal, viewerId)) {
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
        <div className="mt-5 flex flex-wrap gap-2 pr-24 lg:pr-0">
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

/**
 * The counter-offer form in a dialog. It starts from the latest version, so the person only changes what they want.
 * A refusal from the server (for example a newer version arrived) shows inside the dialog, with the typed values kept.
 */
export function CounterDialog({
  latest,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  latest: ProposalVersionView
  pending: boolean
  error: string | null
  onSubmit: (body: VersionBody) => void
  onClose: () => void
}) {
  const titleId = useId()
  const descId = useId()
  // Read once, so the typed values are not replaced when the proposal is read again behind the dialog.
  const [initial] = useState(() => fromVersion(latest))

  // Focus moves into the dialog, Tab stays inside, Escape closes (not while sending), focus goes back on close.
  const dialogRef = useDialogFocus(onClose, !pending)

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) onClose()
        }}
      >
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
          <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          <h2 id={titleId} className="pr-10 font-display text-lg font-medium">Send a counter-offer</h2>
          <p id={descId} className="mt-1 mb-4 text-sm leading-6 text-muted">
            This starts from version {latest.number}. Change the steps, amounts or dates, then send it back.
          </p>
          <ProposalEditor initial={initial} mode="counter" pending={pending} serverError={error} onSubmit={(body) => onSubmit(body)} />
        </section>
      </div>
    </DialogPortal>
  )
}

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

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/**
 * What a version changed compared with the one before it, as short sentences for the panel.
 * The first version has nothing to compare, so it gives an empty list.
 */
export function describeVersionChange(previous: ProposalVersionView | undefined, next: ProposalVersionView): string[] {
  if (!previous) return []
  const out: string[] = []

  if (previous.total !== next.total) out.push(`Total ${credits(previous.total)} to ${credits(next.total)}`)
  if (previous.deadline !== next.deadline) out.push(`Deadline ${formatPipelineDay(previous.deadline)} to ${formatPipelineDay(next.deadline)}`)
  if (previous.brief.trim() !== next.brief.trim()) out.push('Brief changed')
  if (!sameList(previous.referenceLinks, next.referenceLinks) || !sameList(previous.referenceImages, next.referenceImages)) out.push('References changed')

  const a = previous.milestones
  const b = next.milestones
  if (a.length !== b.length) {
    out.push(`${count(a.length, 'milestone')} to ${count(b.length, 'milestone')}`)
  } else {
    b.forEach((m, i) => {
      const old = a[i]
      const parts: string[] = []
      if (old.title !== m.title) parts.push('renamed')
      if (old.amount !== m.amount) parts.push(`${credits(old.amount)} to ${credits(m.amount)}`)
      if (old.dueDate !== m.dueDate) parts.push(`due ${formatPipelineDay(old.dueDate)} to ${formatPipelineDay(m.dueDate)}`)
      if ((old.description ?? '') !== (m.description ?? '') && !parts.length) parts.push('description changed')
      if (parts.length) out.push(`Milestone ${i + 1}: ${parts.join(', ')}`)
    })
  }
  return out
}
