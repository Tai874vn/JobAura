import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ApplicationDetail } from '@/shared/schemas'
import { trackerView, type StepState } from '../../utils/candidate-progress'

const dotStyles: Record<StepState, string> = {
  done: 'border-primary bg-primary text-white',
  current: 'border-primary bg-surface text-primary',
  stopped: 'border-border bg-surface-muted text-muted',
  todo: 'border-border bg-surface text-muted',
}

/**
 * The candidate's progress: Applied, Shortlisted, Interview, Offer, Hired. A finished application keeps the
 * steps it reached in grey ("stopped"), with one sentence under it for why it ended. Hired is all green.
 */
export function ApplicationTracker({
  application,
}: {
  application: Pick<ApplicationDetail, 'status' | 'events'> & { statusReason?: string | null; statusNote?: string | null }
}) {
  const view = trackerView(application)
  return (
    <div>
      <ol aria-label="Progress" className="flex">
        {view.steps.map((step, index) => {
          const filled = step.state === 'done' || step.state === 'stopped'
          return (
            <li
              key={step.label}
              aria-current={step.state === 'current' ? 'step' : undefined}
              data-state={step.state}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-1/2 top-2.5 h-0.5 w-full -translate-y-1/2',
                    filled ? (step.state === 'done' ? 'bg-primary' : 'bg-border') : step.state === 'current' ? 'bg-primary' : 'bg-border',
                  )}
                />
              ) : null}
              <span className={cn('relative flex h-5 w-5 items-center justify-center rounded-full border-2', dotStyles[step.state])}>
                {filled ? <Check className="h-3 w-3" aria-hidden="true" strokeWidth={3} /> : null}
              </span>
              <span className={cn('max-w-full truncate text-xs', step.state === 'current' ? 'font-medium text-foreground' : step.state === 'done' ? 'text-foreground' : 'text-muted')}>
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
      {view.line ? (
        <p className={cn('mt-3 break-words rounded-lg p-3 text-sm', view.tone === 'good' ? 'bg-primary/10 font-medium text-primary' : 'bg-surface-muted')}>{view.line}</p>
      ) : null}
    </div>
  )
}
