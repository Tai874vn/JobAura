/**
 * Part of the contract milestones section. Displays each milestone step with its number, title, status, warning dot, amount, and due date.
 *
 * Calls: milestoneLabel; formatPipelineDay; credits
 * Used by:
 *   - features/contracts/components/contract/contract-milestones.tsx
 */

import { credits } from '@/shared/lib/credits'
import { cn } from '@/shared/lib/utils'
import type { MilestoneView } from '@/shared/schemas'
import { formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'
import { milestoneLabel } from '../../utils/status-labels'

/**
 * One step per milestone: position, title, status word, amount and due date.
 * It wraps onto new lines on a phone, so it never needs a sideways scroll.
 * A small dot with the word "Warning" shows when the server already sent a day-2 warning for that milestone.
 */
export function MilestoneStepper({ milestones, currentId }: { milestones: MilestoneView[]; currentId?: number | null }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {milestones.map((m) => {
        const warned = m.warnings.late || m.warnings.silent || m.warnings.unfunded
        const done = m.status === 'APPROVED'
        const cancelled = m.status === 'CANCELLED'
        return (
          <li
            key={m.id}
            aria-current={m.id === currentId ? 'step' : undefined}
            className={cn(
              'min-w-0 rounded-lg border bg-surface p-3',
              m.id === currentId ? 'border-primary' : 'border-border',
              cancelled && 'opacity-70',
            )}
          >
            <div className="flex items-start gap-2">
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                  done ? 'bg-primary text-white' : 'bg-surface-muted text-foreground',
                )}
              >
                {m.position}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('break-words text-sm font-medium', cancelled && 'line-through')}>{m.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>{milestoneLabel(m.status)}</span>
                  {warned ? (
                    <span className="inline-flex items-center gap-1 text-danger">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-danger" />
                      Warning
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
              <span className="font-medium text-foreground">{credits(m.amount)}</span>
              <span>Due {formatPipelineDay(m.dueDate)}</span>
            </p>
          </li>
        )
      })}
    </ol>
  )
}
