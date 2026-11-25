'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useSession } from '@/features/auth/use-session'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, EmptyState, Pagination } from '@/shared/ui'
import { pipelineApi, pipelineKeys } from './api'
import { MyApplicationListItem } from './my-application-list-item'
import { MyApplicationPanel, MyApplicationPanelLoading } from './my-application-panel'
import { PipelineListSkeleton } from './split-pane-skeletons'
import { UpcomingStrip } from './upcoming-strip'

export const myApplicationsPageSize = 20

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
