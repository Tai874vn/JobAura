'use client'

/**
 * Part of the contracts list page. Shows one proposal or contract row with the other person, status badge, next action, due date, and total price.
 *
 * Calls: nextAction; proposalLabel; contractLabel; endReasonLine; formatPipelineDay; credits
 * Used by:
 *   - features/contracts/components/contracts-page.tsx
 */

import Link from 'next/link'
import { formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'
import { credits } from '@/shared/lib/credits'
import { cn } from '@/shared/lib/utils'
import { Avatar, Badge } from '@/shared/ui'
import type { Row } from '../utils/contracts-selection'
import { nextAction } from '../utils/next-action'
import { contractLabel, endReasonLine, proposalLabel } from '../utils/status-labels'

/**
 * One proposal or contract in the list. The whole row selects it (the panel opens beside the list on wide screens,
 * and as its own view on phones). The title is a real link, so keyboard users and "open in new tab" work.
 */
export function ContractListItem({
  row,
  viewerId,
  href,
  selected,
  onSelect,
}: {
  row: Row
  viewerId: number
  href: string
  selected: boolean
  onSelect: () => void
}) {
  const item = row.item
  const other = item.viewerRole === 'client' ? item.freelancer : item.client
  const action = nextAction(item, viewerId)

  const isProposal = row.kind === 'proposal'
  const title = isProposal ? row.item.job.title : row.item.title
  const status = isProposal ? proposalLabel(row.item, viewerId, other.name) : contractLabel(row.item)
  const reason = !isProposal ? endReasonLine(row.item) : null
  const due = isProposal
    ? `Deadline ${formatPipelineDay(row.item.deadline)}`
    : row.item.currentMilestone
      ? `Milestone ${row.item.currentMilestone.position} due ${formatPipelineDay(row.item.currentMilestone.dueDate)}`
      : null
  const tone = item.status === 'OPEN' || item.status === 'ACTIVE' ? 'primary' : 'neutral'

  return (
    <article
      onClick={(event) => {
        // A click on a link inside the row follows that link.
        if ((event.target as HTMLElement).closest('a')) return
        onSelect()
      }}
      className={cn(
        'group relative flex cursor-pointer gap-3 rounded-xl border bg-surface p-4 transition-colors',
        'border-border hover:border-foreground/25 hover:bg-surface-muted/50',
        selected && 'lg:border-primary lg:bg-primary/[0.04] lg:hover:border-primary lg:hover:bg-primary/[0.04]',
      )}
    >
      <Avatar name={other.name} src={other.avatar} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 font-display text-base font-medium leading-snug">
            <Link
              href={href}
              scroll={false}
              aria-current={selected ? 'true' : undefined}
              onClick={(event) => {
                // A plain click selects like the rest of the row; a new-tab click still follows the link.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
                event.preventDefault()
                onSelect()
              }}
              className={cn('line-clamp-2 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright group-hover:text-primary', selected && 'lg:text-primary')}
            >
              {title}
            </Link>
          </h2>
          <Badge tone={tone} className="shrink-0">{status}</Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          {other.name}
          {isProposal ? ' · Proposal' : null}
        </p>
        {reason ? <p className="mt-0.5 text-xs text-muted">{reason}</p> : null}
        {action.label ? (
          <p className={cn('mt-2 break-words text-sm', action.mine ? 'font-semibold text-primary' : 'text-muted')}>{action.label}</p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {due ? <span>{due}</span> : null}
          <span className="font-medium text-foreground">{credits(row.item.total)}</span>
        </p>
      </div>
    </article>
  )
}
