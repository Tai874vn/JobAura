'use client'

import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import type { ApplicationDetail } from '@/shared/schemas'
import { Avatar } from '@/shared/ui'
import { formatApplicantDay } from './applicant-format'
import { needsAction, nextBooked } from './candidate-progress'
import { formatPipelineTime } from './format-time'
import { StatusBadge } from './status-badge'

/**
 * One application in the candidate's list. The whole row selects it (the panel opens beside the list on wide
 * screens, and as its own view on phones). The title is a real link, so keyboard users and "open in new tab" work.
 */
export function MyApplicationListItem({
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
  const post = application.hiringPost
  const company = post?.companyName || post?.recruiter?.name || 'Company'
  const booked = nextBooked(application.interviews)

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
        // The selected look only on wide screens, where the selected application is open beside the list.
        selected && 'lg:border-primary lg:bg-primary/[0.04] lg:hover:border-primary lg:hover:bg-primary/[0.04]',
      )}
    >
      <Avatar name={company} src={post?.recruiter?.avatar} size="lg" />
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
              className={cn('block truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright group-hover:text-primary', selected && 'lg:text-primary')}
            >
              {post?.title ?? 'Hiring post'}
            </Link>
          </h2>
          <StatusBadge status={application.status} viewer="candidate" reason={application.statusReason} />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{[company, post?.location].filter(Boolean).join(' · ')}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {application.createdAt ? <span>Applied {formatApplicantDay(application.createdAt)}</span> : null}
          {booked ? <span className="font-medium text-foreground">Interview {formatPipelineTime(booked)}</span> : null}
          {needsAction(application) ? <span className="font-medium text-primary">Action needed</span> : null}
        </p>
      </div>
    </article>
  )
}
