'use client'

import { Video } from 'lucide-react'
import Link from 'next/link'
import type { UpcomingInterview } from '@/shared/schemas'
import { Badge, ButtonLink } from '@/shared/ui'
import { formatPipelineTime } from './format-time'

const maxShown = 3

/** Interviews that are booked and still to come, soonest first. Only the ones where the viewer is the candidate. */
export function candidateUpcoming(rows: UpcomingInterview[]): UpcomingInterview[] {
  return rows
    .filter((row) => row.viewerRole === 'candidate' && row.status === 'SCHEDULED' && row.scheduledAt)
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))
}

/** The booked interviews at the top of My applications. Online ones have a Join call button. */
export function UpcomingStrip({ rows, hrefFor }: { rows: UpcomingInterview[]; hrefFor: (applicationId: number) => string }) {
  const upcoming = candidateUpcoming(rows)
  if (!upcoming.length) return null
  return (
    <section aria-labelledby="upcoming-heading" className="mt-4">
      <h2 id="upcoming-heading" className="font-display text-base font-medium">Upcoming interviews</h2>
      <ul className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {upcoming.slice(0, maxShown).map((row) => (
          <li key={row.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium tabular-nums">{formatPipelineTime(row.scheduledAt as string)}</p>
              <Link href={hrefFor(row.applicationId)} scroll={false} className="block truncate text-sm text-muted hover:text-primary">
                {row.post.title}
                {row.post.companyName ? ` · ${row.post.companyName}` : ''} · {row.durationMinutes} min
              </Link>
            </div>
            {row.mode === 'ONLINE' ? (
              <ButtonLink href={`/interviews/${row.id}/call?application=${row.applicationId}`} size="sm" className="shrink-0">
                <Video className="h-4 w-4" aria-hidden="true" />
                Join call
              </ButtonLink>
            ) : (
              <Badge>{row.mode === 'ONSITE' ? 'Onsite' : 'Phone'}</Badge>
            )}
          </li>
        ))}
      </ul>
      {upcoming.length > maxShown ? <p className="mt-2 text-xs text-muted">And {upcoming.length - maxShown} more.</p> : null}
    </section>
  )
}
