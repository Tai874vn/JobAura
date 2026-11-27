'use client'

/**
 * Top section of the contract detail panel on /contracts.
 * Shows the other party, status badge, title, deadline, next action or admin notice, credit totals (total, paid, held, remaining), and the review summary or review prompt.
 *
 * Calls: nextAction; contractLabel; endReasonLine; formatPipelineDay; credits
 * Used by:
 *   - features/contracts/components/contract/contract-panel.tsx
 */

import { Star } from 'lucide-react'
import Link from 'next/link'
import { formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'
import { credits } from '@/shared/lib/credits'
import { cn } from '@/shared/lib/utils'
import type { ContractDetail, PersonSummary } from '@/shared/schemas'
import { Avatar, Badge, Button } from '@/shared/ui'
import { nextAction } from '../../utils/next-action'
import { contractLabel, endReasonLine } from '../../utils/status-labels'

type HeaderProps = {
  contract: ContractDetail
  viewerId: number
  other: PersonSummary
  party: boolean
  isClient: boolean
  notice: string | null
  canReview: boolean
  pending: boolean
  onReview: () => void
}

/**
 * Top of the contract panel: the other side's name and status badge, title, deadline,
 * next-step line, any stale-dialog alert, the four credit figures, and the review block.
 */
export function ContractHeader({
  contract,
  viewerId,
  other,
  party,
  isClient,
  notice,
  canReview,
  pending,
  onReview,
}: HeaderProps) {
  const active = contract.status === 'ACTIVE'
  const reason = endReasonLine(contract)
  const action = nextAction(contract, viewerId)
  const figures = [
    ['Total', contract.total],
    ['Paid', contract.paid],
    ['Held', contract.held],
    ['Remaining', contract.remaining],
  ] as const

  return (
    <>
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

      <ContractReviewSummary contract={contract} isClient={isClient} canReview={canReview} pending={pending} onReview={onReview} />
    </>
  )
}

function ContractReviewSummary({
  contract,
  isClient,
  canReview,
  pending,
  onReview,
}: {
  contract: ContractDetail
  isClient: boolean
  canReview: boolean
  pending: boolean
  onReview: () => void
}) {
  return (
    <>
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
      {canReview ? (
        <div className="mt-4 rounded-lg bg-surface-muted p-4">
          <p className="text-sm">How did it go? Your review helps other clients choose.</p>
          <Button type="button" className="mt-2" disabled={pending} onClick={onReview}>Leave a review</Button>
        </div>
      ) : null}
    </>
  )
}
