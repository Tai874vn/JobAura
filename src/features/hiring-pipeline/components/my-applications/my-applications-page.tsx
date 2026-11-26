'use client'

import { myApplicationsConfig } from '@/page-config/my-applications'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, EmptyState, Pagination, Badge } from '@/shared/ui'
import { pipelineApi, pipelineKeys } from '../../api'
import { MyApplicationListItem } from './my-application-list-item'
import { MyApplicationPanel, MyApplicationPanelLoading } from './my-application-panel'
import { PipelineListSkeleton } from '../split-pane-skeletons'
import { Video } from 'lucide-react'
import Link from 'next/link'
import type { UpcomingInterview } from '@/shared/schemas'
import { formatPipelineTime } from '@/features/hiring-pipeline/utils/format-time'

/** Set in src/page-config/my-applications.ts */
export const myApplicationsPageSize = myApplicationsConfig.pageSize

/** What the list asks the server for; the page and its tests both build the query key from this. */
export function myApplicationsParams(page: number) {
  return { page, pageSize: myApplicationsPageSize }
}

const positive = (value: string | null) => (value && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null)

function isMissing(error: unknown) {
  return error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 403)
}

/**
 * The candidate's own applications. Wide screens are one screen tall: the list scrolls on the left and the
 * selected application stays in view on the right. Phones show the list, and a tap opens the application as its
 * own view with a Back link. The page and the selected application live in the address (?page=, ?application=),
 * so notification links and refreshes land on the same application.
 */
export function MyApplicationsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useSession()

  const page = positive(searchParams.get('page')) ?? 1
  const applicationParam = positive(searchParams.get('application'))

  const hrefFor = useCallback(
    (next: Record<string, string | null>) => {
      const url = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(next)) {
        if (value === null) url.delete(key)
        else url.set(key, value)
      }
      const search = url.toString()
      return search ? `${pathname}?${search}` : pathname
    },
    [pathname, searchParams],
  )
  const go = (next: Record<string, string | null>, mode: 'push' | 'replace' = 'replace') =>
    router[mode](hrefFor(next), { scroll: false })

  const params = myApplicationsParams(page)
  const list = useQuery({
    // The key carries the user id, so one person never sees another person's cached list.
    queryKey: pipelineKeys.mine(params, user?.id),
    queryFn: () => pipelineApi.mine(params),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
  const rows = list.data?.data ?? []
  // Wide screens always have one open; phones only open a view after a tap (?application=).
  const selectedId = applicationParam ?? rows[0]?.id ?? null

  const upcoming = useQuery({
    queryKey: pipelineKeys.upcoming(user?.id),
    queryFn: pipelineApi.upcoming,
    enabled: Boolean(user),
    staleTime: 15_000,
  })

  const detail = useQuery({
    queryKey: pipelineKeys.detail(selectedId ?? 0, user?.id),
    queryFn: () => pipelineApi.detail(selectedId as number),
    enabled: selectedId !== null && Boolean(user),
    staleTime: 15_000,
  })
  const loaded = detail.data && detail.data.id === selectedId ? detail.data : null
  // Never draw an application that belongs to someone else (a mistyped address, or an old cache entry).
  const notMine = Boolean(loaded && user && loaded.applicantId !== user.id)
  const selected = loaded && !notMine ? loaded : null
  const backHref = hrefFor({ application: null })
  const phoneView = applicationParam !== null
  const totalPages = list.data?.totalPages ?? 1

  return (
    <div className="hiring-theme flex flex-col bg-background text-foreground lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <div className="container-page flex min-h-0 flex-1 flex-col pb-6 pt-6 lg:pb-4">
        <div className="flex-none">
          <h1 className="font-display text-2xl font-medium leading-tight sm:text-3xl">My applications</h1>
          <UpcomingStrip rows={upcoming.data ?? []} hrefFor={(id) => hrefFor({ application: String(id) })} />
        </div>

        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1.5">
            {list.isPending ? (
              <PipelineListSkeleton />
            ) : list.isError ? (
              <EmptyState title="Could not load your applications" description={getErrorMessage(list.error, 'Check your connection and try again.')} action={<Button onClick={() => void list.refetch()}>Try again</Button>} />
            ) : rows.length ? (
              <ul className={cn('grid gap-2 transition-opacity duration-200', list.isPlaceholderData && 'opacity-60')} role="listbox" aria-busy={list.isPlaceholderData} aria-label="My applications">
                {rows.map((row) => (
                  <li key={row.id} role="option" aria-selected={row.id === selectedId}>
                    <MyApplicationListItem
                      application={row}
                      href={hrefFor({ application: String(row.id) })}
                      selected={row.id === selectedId}
                      onSelect={() => go({ application: String(row.id) }, 'push')}
                    />
                  </li>
                ))}
              </ul>
            ) : selectedId === null ? (
              <EmptyState
                title="No applications yet"
                description="When you apply to a hiring post, you can follow it here."
                action={<ButtonLink href="/hiring-posts">Browse hiring posts</ButtonLink>}
              />
            ) : null}
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} boxed label="Application pages" onPage={(next) => go({ page: next > 1 ? String(next) : null, application: null })} />
            </div>
          </div>

          <div className={phoneView ? 'max-lg:motion-drawer fixed inset-x-0 bottom-0 top-16 z-30 min-h-0 min-w-0 overflow-hidden bg-background lg:static lg:z-auto lg:bg-transparent' : 'hidden min-h-0 min-w-0 lg:block'}>
            {selected ? (
              <MyApplicationPanel key={selected.id} application={selected} backHref={backHref} />
            ) : selectedId !== null && (notMine || (detail.isError && isMissing(detail.error))) ? (
              <EmptyState title="Could not open this application" description="It does not exist, or it is not yours." action={<ButtonLink href="/my-applications" variant="secondary">All applications</ButtonLink>} />
            ) : selectedId !== null && detail.isError ? (
              <EmptyState title="Could not open this application" description={getErrorMessage(detail.error, 'Check your connection and try again.')} action={<Button onClick={() => void detail.refetch()}>Try again</Button>} />
            ) : selectedId !== null || list.isPending ? (
              <MyApplicationPanelLoading row={rows.find((row) => row.id === selectedId)} backHref={backHref} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

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
