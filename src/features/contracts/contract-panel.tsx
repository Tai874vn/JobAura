'use client'

import Link from 'next/link'
import { credits } from '@/shared/lib/credits'
import type { ContractDetail } from '@/shared/schemas'
import { Avatar, Badge } from '@/shared/ui'
import { ContractTimeline } from './contract-timeline'
import { MilestoneStepper } from './milestone-stepper'
import { nextAction } from './next-action'
import { PanelFrame } from './panel-frame'
import { contractLabel, endReasonLine } from './status-labels'

/**
 * THE SLOT FOR TASK 5. The contracts page mounts `<ContractPanel contract viewerId backHref />` for `?contract=<id>`.
 * Today it only reads: header, totals, the steps and the history. Task 5 replaces the inside of this file with the real
 * panel (fund, submit, approve, change requests, ending, review) and keeps these props, so the page does not change.
 * Mount it with `key={contract.id}`.
 */
export function ContractPanel({ contract, viewerId, backHref }: { contract: ContractDetail; viewerId: number; backHref: string }) {
  const other = contract.viewerRole === 'client' ? contract.freelancer : contract.client
  const action = nextAction(contract, viewerId)
  const reason = endReasonLine(contract)
  const current = contract.milestones.find((m) => m.status !== 'APPROVED' && m.status !== 'CANCELLED')

  return (
    <PanelFrame backHref={backHref} labelledBy={`contract-${contract.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={other.name} src={other.avatar} size="lg" />
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-medium">{other.name}</p>
          <p className="truncate text-sm text-muted">{contract.viewerRole === 'client' ? 'Seller' : 'Client'}</p>
        </div>
        <Badge tone={contract.status === 'ACTIVE' ? 'primary' : 'neutral'}>{contractLabel(contract)}</Badge>
      </div>

      <h2 id={`contract-${contract.id}`} className="mt-4 break-words font-display text-xl font-medium leading-tight">
        <Link href={`/jobs/${contract.job.id}`} className="hover:text-primary">{contract.title}</Link>
      </h2>
      {reason ? <p className="mt-1 text-sm text-muted">{reason}</p> : null}
      {action.label ? <p className={action.mine ? 'mt-2 text-sm font-semibold text-primary' : 'mt-2 text-sm text-muted'}>{action.label}</p> : null}

      <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-border sm:grid-cols-4 [&>div]:border-b [&>div]:border-border">
        {[
          ['Total', contract.total],
          ['Paid', contract.paid],
          ['Held', contract.held],
          ['Not funded', contract.remaining],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium tabular-nums">{credits(value as number)}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-6 font-display text-base font-medium">Milestones</h3>
      <div className="mt-2"><MilestoneStepper milestones={contract.milestones} currentId={current?.id} /></div>

      <h3 className="mt-6 font-display text-base font-medium">History</h3>
      <div className="mt-2"><ContractTimeline events={contract.events} /></div>
    </PanelFrame>
  )
}
