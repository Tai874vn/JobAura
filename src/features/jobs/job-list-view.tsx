'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { SlidersHorizontal, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { JobCard } from './job-card'
import { Card, CardContent, CardSkeleton } from '@/shared/ui'

const pageSize = 12

function pageWindow(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right)
}

export function JobListView() {
  const searchParams = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
  const keyword = searchParams.get('keyword') ?? undefined
  const query = useQuery({
    queryKey: queryKeys.jobs({ page, keyword }),
    queryFn: () => jobsApi.paginated({ page, pageSize, keyword }),
    placeholderData: keepPreviousData,
  })
  const content = query.data?.content
  const jobs = content?.data ?? []
  const calculatedTotalPages = Math.ceil((content?.totalRow ?? 0) / pageSize) || 1
  const totalPages = Math.max(1, content?.totalPages ?? calculatedTotalPages)

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (targetPage <= 1) params.delete('page')
    else params.set('page', String(targetPage))
    const queryString = params.toString()
    return queryString ? `/jobs?${queryString}` : '/jobs'
  }

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Explore services</h1>
          <p className="mt-1 text-sm text-muted">{keyword ? `Results for "${keyword}"` : 'Search and compare marketplace services.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/recommendations/jobs"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-bright focus-visible:ring-2 focus-visible:ring-primary-bright"
          >
            <Sparkles className="h-4 w-4" />
            AI recommendations
          </Link>
          <button className="flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>
      {query.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : jobs.length ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {jobs.map((job, index) => <JobCard key={job.id} job={job} priority={index < 4} />)}
          </div>
          <PaginationControls currentPage={page} totalPages={totalPages} pageHref={pageHref} />
        </>
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted">No services found. Try another keyword.</CardContent>
        </Card>
      )}
    </div>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  pageHref,
}: {
  currentPage: number
  totalPages: number
  pageHref: (page: number) => string
}) {
  if (totalPages <= 1) return null

  const pages = pageWindow(currentPage, totalPages)

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Jobs pagination">
      <PageLink href={pageHref(currentPage - 1)} disabled={currentPage <= 1}>
        Previous
      </PageLink>
      {pages.map((page, index) => (
        <span key={page} className="flex items-center gap-2">
          {index > 0 && page - pages[index - 1] > 1 ? <span className="px-1 text-sm font-semibold text-muted">...</span> : null}
          <PageLink href={pageHref(page)} active={page === currentPage}>
            {page}
          </PageLink>
        </span>
      ))}
      <PageLink href={pageHref(currentPage + 1)} disabled={currentPage >= totalPages}>
        Next
      </PageLink>
    </nav>
  )
}

function PageLink({
  href,
  active = false,
  disabled = false,
  children,
}: {
  href: string
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  const className = [
    'inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition',
    active ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground hover:border-primary hover:text-primary',
    disabled ? 'pointer-events-none opacity-50' : '',
  ].join(' ')

  return (
    <Link href={disabled ? '#' : href} className={className} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  )
}
