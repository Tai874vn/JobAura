'use client'

import { applicantsConfig } from '@/features/hiring-pipeline/config/applicants'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { hiringPostsApi } from '@/shared/api/endpoints/hiring-posts'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import type { ApplicationStatus } from '@/shared/schemas'
import { Badge, Button, ButtonLink, EmptyState, Pagination, Skeleton } from '@/shared/ui'
import { pipelineApi, pipelineKeys } from '../../api'
import { ApplicantListItem } from './applicant-list-item'
import { ApplicantPanel, ApplicantPanelLoading } from './applicant-panel'
import { PipelineListSkeleton } from '../split-pane-skeletons'

/** Set in src/features/hiring-pipeline/config/applicants.ts */
export const applicantsPageSize = applicantsConfig.pageSize

/** The tabs. "Not selected" is the REJECTED status; the others keep their own name. */
/** Set in src/features/hiring-pipeline/config/applicants.ts (tabs). */
export const applicantTabs: readonly { key: 'all' | ApplicationStatus; label: string }[] = applicantsConfig.tabs

/** What the list asks the server for; the page and its tests both build the query key from this. */
export function applicantsListParams(status: ApplicationStatus | undefined, page: number) {
  return { status, page, pageSize: applicantsPageSize }
}

/** "1 of 2 filled", or a sentence when the post has no limit. */
export function filledText(post: { openings?: number | null; hiredCount?: number }) {
  return post.openings == null ? 'Hiring without a limit' : `${post.hiredCount ?? 0} of ${post.openings} filled`
}

const tabKeys = new Set<string>(applicantTabs.map((tab) => tab.key))
const positive = (value: string | null) => (value && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null)

function isMissing(error: unknown) {
  return error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 403)
}

function NotFound() {
  return (
    <div className="container-page py-10">
      <EmptyState
        titleAs="h1"
        title="Applicants not found"
        description="This hiring post does not exist, or it is not yours."
        action={<ButtonLink href="/my-hiring-posts">My hiring posts</ButtonLink>}
      />
    </div>
  )
}

/**
 * The recruiter's applicants for one hiring post. Wide screens are one screen tall: the list scrolls on the left
 * and the selected applicant stays in view on the right. Phones show the list, and a tap opens the applicant as
 * its own view with a Back link. The tab, the page and the selected applicant live in the address (?status=,
 * ?page=, ?application=), so notification links and refreshes land on the same applicant.
 */
export function ApplicantsPage({ postId }: { postId: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useSession()

  const statusParam = searchParams.get('status') ?? 'all'
  const tab = tabKeys.has(statusParam) ? (statusParam as 'all' | ApplicationStatus) : 'all'
  const status = tab === 'all' ? undefined : tab
  const page = positive(searchParams.get('page')) ?? 1
  const applicationParam = positive(searchParams.get('application'))
  const outcomeOnLoad = searchParams.get('outcome') === '1'

  const go = useCallback(
    (next: Record<string, string | null>, mode: 'push' | 'replace' = 'replace') => {
      const url = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(next)) {
        if (value === null) url.delete(key)
        else url.set(key, value)
      }
      const search = url.toString()
      router[mode](search ? `${pathname}?${search}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )
  const hrefFor = (next: Record<string, string | null>) => {
    const url = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) url.delete(key)
      else url.set(key, value)
    }
    const search = url.toString()
    return search ? `${pathname}?${search}` : pathname
  }

  const postQuery = useQuery({
    queryKey: ['hiring-posts', 'detail', postId, user?.id ?? 0],
    queryFn: () => hiringPostsApi.one(postId),
    enabled: Boolean(user),
    staleTime: 15_000,
  })
  const post = postQuery.data?.content
  const allowed = Boolean(post && user && user.id === post.recruiterId)

  const listParams = applicantsListParams(status, page)
  const list = useQuery({
    queryKey: pipelineKeys.list(postId, listParams, user?.id),
    queryFn: () => pipelineApi.list(postId, listParams),
    enabled: Boolean(user) && (!post || allowed),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
  const rows = list.data?.data ?? []
  const counts = list.data?.counts
  // Wide screens always have someone open; phones only open a view after a tap (?application=).
  const selectedId = applicationParam ?? rows[0]?.id ?? null

  const detail = useQuery({
    queryKey: pipelineKeys.detail(selectedId ?? 0, user?.id),
    queryFn: () => pipelineApi.detail(selectedId as number),
    enabled: selectedId !== null && (!post || allowed),
    // Back from the call screen the cached application can be old: read it again before the outcome is decided.
    refetchOnMount: outcomeOnLoad ? 'always' : true,
    staleTime: 15_000,
  })
  const loaded = detail.data && detail.data.id === selectedId ? detail.data : null
  const otherPost = Boolean(loaded && loaded.hiringPostId !== postId)
  // With ?outcome=1 the panel waits for a fresh read, so the dialog opens (or not) from the real state.
  const selected = loaded && !otherPost && (!outcomeOnLoad || detail.isFetchedAfterMount) ? loaded : null
  const onOutcomeShown = useCallback(() => go({ outcome: null }), [go])

  if (postQuery.isError && isMissing(postQuery.error)) return <NotFound />
  if (post && !allowed) return <NotFound />
  if (list.isError && isMissing(list.error)) return <NotFound />

  const total = counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : null
  const countOf = (key: 'all' | ApplicationStatus) => (!counts ? null : key === 'all' ? total : counts[key])
  const totalPages = list.data?.totalPages ?? 1
  const phoneView = applicationParam !== null

  return (
    <div className="hiring-theme flex flex-col bg-background text-foreground lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <div className="container-page flex min-h-0 flex-1 flex-col pb-6 pt-6 lg:pb-4">
        <div className="flex-none">
          <Link href="/my-hiring-posts" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            My hiring posts
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h1 className="break-words font-display text-2xl font-medium leading-tight sm:text-3xl">{post?.title ?? 'Applicants'}</h1>
              {post ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{filledText(post)}</span>
                  <Badge tone={post.status === 'OPEN' ? 'primary' : 'neutral'}>{post.status === 'OPEN' ? 'Open' : 'Closed'}</Badge>
                </p>
              ) : postQuery.isPending ? (
                <Skeleton className="mt-2 h-5 w-48" />
              ) : null}
            </div>
            {post ? (
              <div className="flex gap-2">
                <ButtonLink href={`/hiring-posts/${post.id}`} variant="secondary" size="sm">View post</ButtonLink>
                <ButtonLink href={`/my-hiring-posts?edit=${post.id}`} variant="secondary" size="sm">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </ButtonLink>
              </div>
            ) : null}
          </div>

          <div role="tablist" aria-label="Applicant status" className="-mx-1 mt-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-1">
            {applicantTabs.map(({ key, label }) => {
              const count = countOf(key)
              const active = key === tab
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => go({ status: key === 'all' ? null : key, page: null, application: null })}
                  className={cn(
                    '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-bright',
                    active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground',
                  )}
                >
                  {label}
                  {count !== null ? <span className="tabular-nums text-xs">{count}</span> : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1.5">
            {list.isPending ? (
              <PipelineListSkeleton />
            ) : list.isError ? (
              <EmptyState title="Could not load applicants" description={getErrorMessage(list.error, 'Check your connection and try again.')} action={<Button onClick={() => void list.refetch()}>Try again</Button>} />
            ) : rows.length ? (
              <ul className={cn('grid gap-2 transition-opacity duration-200', list.isPlaceholderData && 'opacity-60')} role="listbox" aria-busy={list.isPlaceholderData} aria-label="Applicants">
                {rows.map((row) => (
                  <li key={row.id} role="option" aria-selected={row.id === selectedId}>
                    <ApplicantListItem
                      application={row}
                      href={hrefFor({ application: String(row.id) })}
                      selected={row.id === selectedId}
                      onSelect={() => go({ application: String(row.id) }, 'push')}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-muted">No applicants here yet.</p>
            )}
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} boxed label="Applicant pages" onPage={(next) => go({ page: next > 1 ? String(next) : null, application: null })} />
            </div>
          </div>

          <div className={cn('min-h-0 min-w-0', phoneView ? 'max-lg:motion-drawer fixed inset-x-0 bottom-0 top-16 z-30 overflow-hidden bg-background lg:static lg:z-auto lg:bg-transparent' : 'hidden lg:block')}>
            {selected ? (
              <ApplicantPanel
                key={selected.id}
                application={selected}
                backHref={hrefFor({ application: null, outcome: null })}
                outcomeOnLoad={outcomeOnLoad}
                onOutcomeShown={onOutcomeShown}
              />
            ) : selectedId !== null && (detail.isError || otherPost) ? (
              <EmptyState title="Could not open this applicant" description={otherPost ? 'They may belong to another post.' : getErrorMessage(detail.error, 'They may belong to another post.')} />
            ) : selectedId !== null || list.isPending ? (
              <ApplicantPanelLoading row={rows.find((row) => row.id === selectedId)} backHref={hrefFor({ application: null, outcome: null })} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
