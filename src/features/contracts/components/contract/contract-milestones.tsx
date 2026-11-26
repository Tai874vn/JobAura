'use client'

import { useEffect, useState } from 'react'
import { formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'
import { credits } from '@/shared/lib/credits'
import { cn } from '@/shared/lib/utils'
import type { ContractDetail, MilestoneView } from '@/shared/schemas'
import { milestoneClock, type ContractDialog } from '../../utils/contract-actions'
import { MilestoneActionBar } from './contract-action-bar'
import type { ContractViewerRole } from '../../utils/milestone-actions'
import { MilestoneStepper } from './milestone-stepper'
import { milestoneLabel } from '../../utils/status-labels'
import { SubmissionCard } from './submission-card'

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
