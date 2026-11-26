'use client'

import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import type { ApplicationDetail } from '@/shared/schemas'
import { Avatar } from '@/shared/ui'
import { formatApplicantDay, formatYears } from '../../utils/applicant-format'
import { formatPipelineTime } from '../../utils/format-time'
import { StatusBadge } from '../status-badge'

/** What the list says about the interview: the booked time, or that a time is still being found. */
function interviewLine(interviews: ApplicationDetail['interviews']): { text: string; booked: boolean } | null {
  const booked = interviews.find((i) => i.status === 'SCHEDULED' && i.scheduledAt)
  if (booked?.scheduledAt) return { text: `Interview ${formatPipelineTime(booked.scheduledAt)}`, booked: true }
  if (interviews.some((i) => i.status === 'PROPOSED' || i.status === 'RESCHEDULE_REQUESTED')) {
    return { text: 'Interview: waiting for a time', booked: false }
  }
  return null
}

/**
 * One applicant in the list. The whole row selects the applicant (the panel opens beside the list on wide
 * screens, and as its own view on phones). The name is a real link, so keyboard users and "open in new tab" work.
 */
export function ApplicantListItem({
  application,
  href,
  selected,
  onSelect,
}: {
  application: ApplicationDetail
  href: string
  selected: boolean
  onSelect: () => void
}) {
  const applicant = application.applicant
  const name = applicant?.name ?? 'Applicant'
  const resume = application.resume
  const next = interviewLine(application.interviews)
  const summary = [
    resume?.occupationTitle || applicant?.headline,
    resume?.years != null ? formatYears(resume.years) : null,
    resume?.level ? `AI level ${resume.level}` : null,
  ].filter(Boolean)

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
        // The selected look only on wide screens, where the selected applicant is open beside the list.
        selected && 'lg:border-primary lg:bg-primary/[0.04] lg:hover:border-primary lg:hover:bg-primary/[0.04]',
      )}
    >
      <Avatar name={name} src={applicant?.avatar} size="lg" />
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
              {name}
            </Link>
          </h2>
          <StatusBadge status={application.status} viewer="recruiter" reason={application.statusReason} />
        </div>
        {summary.length ? <p className="mt-0.5 truncate text-sm text-muted">{summary.join(' · ')}</p> : null}
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {application.createdAt ? <span>Applied {formatApplicantDay(application.createdAt)}</span> : null}
          {next ? <span className={cn(next.booked && 'font-medium text-foreground')}>{next.text}</span> : null}
        </p>
      </div>
    </article>
  )
}
