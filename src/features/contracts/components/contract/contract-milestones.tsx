'use client'

/**
 * Milestone and submitted-work sections of the contract detail panel on /contracts.
 * Shows the milestone stepper, the current active milestone card with a live countdown and action buttons, and the list of submissions with images, links, and client feedback.
 *
 * Calls: MilestoneStepper; MilestoneActionBar; milestoneClock; milestoneLabel; formatPipelineDay; formatPipelineTime; credits
 * Used by:
 *   - features/contracts/components/contract/contract-panel.tsx
 *   - features/contracts/components/dialogs/contract-dialogs.tsx
 */

import { useEffect, useState } from 'react'
import { formatPipelineDay, formatPipelineTime } from '@/features/hiring-pipeline/utils/format-time'
import { credits } from '@/shared/lib/credits'
import { cn } from '@/shared/lib/utils'
import type { ContractDetail, MilestoneView, SubmissionView } from '@/shared/schemas'
import { milestoneClock, type ContractDialog } from '../../utils/contract-actions'
import { MilestoneActionBar } from './contract-action-bar'
import type { ContractViewerRole } from '../../utils/milestone-actions'
import { MilestoneStepper } from './milestone-stepper'
import { milestoneLabel } from '../../utils/status-labels'
import Image from 'next/image'

export const milestoneName = (m: MilestoneView) => `Milestone ${m.position}: ${m.title}`

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

/** The milestone list (stepper) plus the active milestone card when the contract is still running. */
export function ContractMilestones({
  contract,
  current,
  role,
  pending,
  onOpenDialog,
}: {
  contract: ContractDetail
  current: MilestoneView | null
  role: ContractViewerRole
  pending: boolean
  onOpenDialog: (dialog: ContractDialog) => void
}) {
  const active = contract.status === 'ACTIVE'

  return (
    <>
      <h3 className="mt-6 font-display text-base font-medium">Milestones</h3>
      <div className="mt-2"><MilestoneStepper milestones={contract.milestones} currentId={active ? current?.id : null} /></div>

      {current && active ? (
        <CurrentMilestoneItem contract={contract} milestone={current} role={role} pending={pending} onOpenDialog={onOpenDialog} />
      ) : null}
    </>
  )
}

/** The focused card for the current active milestone, with its countdown clock and role-specific action bar. */
function CurrentMilestoneItem({
  contract,
  milestone,
  role,
  pending,
  onOpenDialog,
}: {
  contract: ContractDetail
  milestone: MilestoneView
  role: ContractViewerRole
  pending: boolean
  onOpenDialog: (dialog: ContractDialog) => void
}) {
  // Keep the 1-minute clock timer inside this card so only the countdown re-renders as time passes.
  const now = useNow(contract.status === 'ACTIVE')
  const clock = milestoneClock(contract, milestone, now)

  return (
    <section className="mt-4 rounded-lg border border-primary/40 p-4" aria-label="Current milestone">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="min-w-0 break-words font-display text-base font-medium">{milestoneName(milestone)}</h3>
        <p className="text-sm text-muted">{milestoneLabel(milestone.status)}</p>
      </div>
      {milestone.description ? <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{milestone.description}</p> : null}
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="font-medium tabular-nums">{credits(milestone.amount)}</span>
        <span>Due {formatPipelineDay(milestone.dueDate)}</span>
      </p>
      {clock ? <p className={cn('mt-1 text-sm', clock.warn ? 'font-medium text-danger' : 'text-muted')}>{clock.text}</p> : null}

      <MilestoneActionBar role={role} contractStatus={contract.status} milestone={milestone} pending={pending} onOpenDialog={onOpenDialog} />
    </section>
  )
}

/** All submissions across every milestone, newest first. */
export function ContractSubmissions({ contract }: { contract: ContractDetail }) {
  const submissions = allSubmissions(contract)

  return (
    <>
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
    </>
  )
}

/** The host of a link ("example.com"), so a long address does not fill the card. */
function linkLabel(link: string): string {
  try {
    return new URL(link).host
  } catch {
    return link
  }
}

/** One piece of work the freelancer sent for a milestone, with the client's feedback under it (if any). */
export function SubmissionCard({ submission }: { submission: SubmissionView }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-3">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h4 className="font-display text-sm font-medium">Submission {submission.number}</h4>
        <p className="text-xs text-muted">{formatPipelineTime(submission.createdAt)}</p>
      </header>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{submission.note}</p>

      {submission.images.length ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Images">
          {submission.images.map((url, i) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright">
                <Image src={url} alt={`Image ${i + 1} of submission ${submission.number}, opens full size`} width={96} height={96} className="h-24 w-24 object-cover" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {submission.links.length ? (
        <ul className="mt-3 space-y-1" aria-label="Links">
          {submission.links.map((link) => (
            <li key={link} className="min-w-0 text-sm">
              <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline-offset-2 hover:underline">
                {linkLabel(link)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {submission.feedback ? (
        <div className="mt-3 rounded-md bg-surface-muted p-3">
          <p className="text-xs font-medium text-muted">Client feedback</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{submission.feedback}</p>
        </div>
      ) : null}
    </article>
  )
}
