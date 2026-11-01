'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronDown, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { jobTypesApi, jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { JobSearchParams } from '@/shared/schemas'
import { cn } from '@/shared/lib/utils'
import { JobCard } from './job-card'
import { JobCategoryNav } from './job-category-nav'
import { JobFilterPanel } from './job-filter-panel'
import { JobResultsSkeleton } from './job-results-skeleton'
import { Button, EmptyState, Spinner } from '@/shared/ui'

const pageSize = 12

function pageWindow(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right)
}

type FilterKey = 'keyword' | 'category' | 'subcategory' | 'minPrice' | 'maxPrice' | 'minRating'

export function JobListView() {
  const router = useRouter()
  const [isNavigating, startNavigation] = useTransition()
  const [isApplying, setIsApplying] = useState(false)
  const searchParams = useSearchParams()
  const page = positiveNumber(searchParams.get('page')) ?? 1
  const keyword = searchParams.get('keyword') ?? undefined
  const categoryId = positiveNumber(searchParams.get('category') ?? searchParams.get('categoryId'))
  const subcategoryId = positiveNumber(searchParams.get('subcategory') ?? searchParams.get('subcategoryId'))
  const minPrice = nonNegativeNumber(searchParams.get('minPrice'))
  const maxPrice = nonNegativeNumber(searchParams.get('maxPrice'))
  const minRating = nonNegativeNumber(searchParams.get('minRating'))
  const sort = jobSort(searchParams.get('sort'))
  const categoriesQuery = useQuery({ queryKey: queryKeys.jobTypes, queryFn: jobTypesApi.all, staleTime: 5 * 60 * 1000 })
  const categories = useMemo(() => categoriesQuery.data?.content ?? [], [categoriesQuery.data?.content])
  const subcategories = useMemo(() => categories.flatMap((category) => category.subcategories ?? []), [categories])
  const apiParams: JobSearchParams = { page, pageSize, keyword, categoryId, subcategoryId, minPrice, maxPrice, minRating, sort }
  const query = useQuery({
    queryKey: queryKeys.jobs(apiParams),
    queryFn: () => jobsApi.paginated(apiParams),
    placeholderData: keepPreviousData,
  })
  const content = query.data?.content
  const jobs = content?.data ?? []
  const calculatedTotalPages = Math.ceil((content?.totalRow ?? 0) / pageSize) || 1
  const totalPages = Math.max(1, content?.totalPages ?? calculatedTotalPages)
  const [panelOpen, setPanelOpen] = useState(
    () => Boolean(subcategoryId || minPrice !== undefined || maxPrice !== undefined || minRating !== undefined)
  )
  const isLoading = isNavigating || query.isPending || query.isPlaceholderData
    || (query.isFetching && (!content || isApplying))
  // The route transition covers the click-to-URL phase; the query covers the
  // subsequent API fetch. Keep the form visible until both have settled.
  if (isApplying && !isNavigating && !query.isFetching) {
    setIsApplying(false)
    if (!query.isError) setPanelOpen(false)
  }

  function navigate(href: string) {
    startNavigation(() => router.push(href))
  }

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: FilterKey; label: string }> = []
    if (keyword) filters.push({ key: 'keyword', label: `"${keyword}"` })
    if (categoryId) {
      const name = categories.find((category) => category.id === categoryId)?.tenLoaiCongViec
      filters.push({ key: 'category', label: name ?? `Category #${categoryId}` })
    }
    if (subcategoryId) {
      const name = subcategories.find((subcategory) => subcategory.id === subcategoryId)?.tenChiTiet
      filters.push({ key: 'subcategory', label: name ?? `Specialty #${subcategoryId}` })
    }
    if (minPrice !== undefined) filters.push({ key: 'minPrice', label: `From $${minPrice}` })
    if (maxPrice !== undefined) filters.push({ key: 'maxPrice', label: `Under $${maxPrice}` })
    if (minRating !== undefined) filters.push({ key: 'minRating', label: `${minRating}+ stars` })
    return filters
  }, [categoryId, keyword, maxPrice, minPrice, minRating, subcategoryId, subcategories, categories])

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    params.delete('page')
    const queryString = params.toString()
    navigate(queryString ? `/jobs?${queryString}` : '/jobs')
  }

  function submitKeyword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = stringValue(new FormData(event.currentTarget).get('keyword'))
    pushParams((params) => setParam(params, 'keyword', value))
  }

  function setSort(value: string) {
    pushParams((params) => setParam(params, 'sort', value))
  }

  function removeFilter(key: FilterKey) {
    pushParams((params) => {
      params.delete(key)
      if (key === 'category') params.delete('subcategory')
    })
  }

  function applyPanel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setIsApplying(true)
    pushParams((params) => {
      setParam(params, 'subcategory', stringValue(data.get('subcategory')))
      setParam(params, 'minPrice', stringValue(data.get('minPrice')))
      setParam(params, 'maxPrice', stringValue(data.get('maxPrice')))
      setParam(params, 'minRating', stringValue(data.get('minRating')))
    })
  }

  function clearAllFilters() {
    navigate('/jobs')
  }

  const heroSearch = (
    <form
      onSubmit={submitKeyword}
      className="mt-5 flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition focus-within:border-primary"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4">
        <Search className="h-5 w-5 shrink-0 text-muted" />
        <input
          key={keyword ?? ''}
          name="keyword"
          defaultValue={keyword ?? ''}
          placeholder="Search services or sellers…"
          aria-label="Search services or sellers"
          className="h-[52px] w-full min-w-0 bg-transparent text-sm outline-none"
        />
      </div>
      <Button type="submit" loading={isLoading} className="h-auto shrink-0 rounded-none px-5">
        <Search className="h-4 w-4" aria-hidden="true" />
        Search
      </Button>
    </form>
  )

  const popularSearches = ['logo design', 'web development', 'video editing', 'SEO', 'data entry']

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="container-page pt-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">Explore services</h1>
        {heroSearch}
        <div className="mt-3.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Popular</span>
          {popularSearches.map((term) => (
            <Link key={term} href={`/jobs?keyword=${encodeURIComponent(term)}`} onNavigate={(event) => { event.preventDefault(); navigate(`/jobs?keyword=${encodeURIComponent(term)}`) }} className="rounded font-medium text-muted transition hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary-bright">
              {term}
            </Link>
          ))}
        </div>
      </div>

      <JobCategoryNav categories={categories} selectedId={categoryId} loading={categoriesQuery.isPending} navigate={navigate} />

      <div className="container-page mt-4 flex min-w-0 flex-1 flex-col pb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-sm text-muted" aria-live="polite">
            <b className="font-bold text-foreground">{isLoading ? '…' : content?.totalRow ?? 0}</b> services
          </p>
          {query.isFetching && !isLoading ? <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted"><Spinner className="h-3.5 w-3.5" /> Updating services</span> : null}
          <div className="flex min-w-0 max-w-full flex-wrap gap-1.5">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => removeFilter(filter.key)}
                title="Remove filter"
                className="inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-xs font-semibold text-foreground transition hover:border-danger hover:text-danger focus-visible:ring-2 focus-visible:ring-primary-bright"
              >
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{filter.label}</span>
                <X className="h-3 w-3 shrink-0 text-muted" />
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-muted">
              Sort
              <select
                value={sort ?? ''}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort services"
                className="h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary-bright"
              >
                <option value="">Default</option>
                <option value="newest">Newest</option>
                <option value="rating_desc">Top rated</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPanelOpen((open) => !open)}
              aria-expanded={panelOpen}
              aria-controls="job-filter-panel"
              disabled={isApplying}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-semibold transition focus-visible:ring-2 focus-visible:ring-primary-bright disabled:opacity-50',
                panelOpen ? 'border-primary text-primary' : 'text-foreground hover:border-primary hover:text-primary'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilters.length ? (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10.5px] font-bold text-white">
                  {activeFilters.length}
                </span>
              ) : null}
              <ChevronDown className={cn('h-4 w-4 transition-transform', panelOpen && 'rotate-180')} />
            </button>
          </div>
        </div>

        {panelOpen ? (
          <JobFilterPanel key={JSON.stringify([subcategoryId, minPrice, maxPrice, minRating])} values={{ subcategoryId, minPrice, maxPrice, minRating }} subcategories={subcategories} loading={isApplying} onApply={applyPanel} onClear={clearAllFilters} />
        ) : null}

        <section className="mt-5 flex flex-1 flex-col" aria-label="Service results" aria-busy={isLoading}>
          {isLoading ? (
            <JobResultsSkeleton />
          ) : query.isError ? (
            <EmptyState
              fill
              icon={<SearchX />}
              title="Unable to load services"
              description="Check the backend connection and try again."
              action={<Button variant="secondary" onClick={() => query.refetch()}>Retry</Button>}
            />
          ) : jobs.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {jobs.map((job, index) => <JobCard key={job.id} job={job} priority={index === 0} waitForImages />)}
              </div>
              <PaginationControls currentPage={page} totalPages={totalPages} pageHref={pageHref(searchParams)} navigate={navigate} />
            </>
          ) : (
            <EmptyState
              fill
              icon={<SearchX />}
              title="No services found"
              description="Try another keyword or clear some filters to see more results."
              action={<Button variant="secondary" onClick={clearAllFilters}>Clear filters</Button>}
            />
          )}
        </section>
      </div>
    </div>
  )

  function pageHref(params: URLSearchParams) {
    return (targetPage: number) => {
      const next = new URLSearchParams(params.toString())
      if (targetPage <= 1) next.delete('page')
      else next.set('page', String(targetPage))
      const queryString = next.toString()
      return queryString ? `/jobs?${queryString}` : '/jobs'
    }
  }
}

function positiveNumber(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function nonNegativeNumber(value: string | null) {
  if (value === null || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function setParam(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value)
  else params.delete(key)
}

function jobSort(value: string | null): JobSearchParams['sort'] {
  if (value === 'newest' || value === 'price_asc' || value === 'price_desc' || value === 'rating_desc') return value
  return undefined
}

function PaginationControls({
  currentPage,
  totalPages,
  pageHref,
  navigate,
}: {
  currentPage: number
  totalPages: number
  pageHref: (page: number) => string
  navigate: (href: string) => void
}) {
  if (totalPages <= 1) return null

  const pages = pageWindow(currentPage, totalPages)

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Jobs pagination">
      <PageLink href={pageHref(currentPage - 1)} disabled={currentPage <= 1} navigate={navigate}>
        Previous
      </PageLink>
      {pages.map((page, index) => (
        <span key={page} className="flex items-center gap-2">
          {index > 0 && page - pages[index - 1] > 1 ? <span className="px-1 text-sm font-semibold text-muted">...</span> : null}
          <PageLink href={pageHref(page)} active={page === currentPage} navigate={navigate}>
            {page}
          </PageLink>
        </span>
      ))}
      <PageLink href={pageHref(currentPage + 1)} disabled={currentPage >= totalPages} navigate={navigate}>
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
  navigate,
}: {
  href: string
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  navigate: (href: string) => void
}) {
  const className = [
    'inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-primary-bright',
    active ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-foreground hover:border-primary hover:text-primary',
    disabled ? 'pointer-events-none opacity-50' : '',
  ].join(' ')

  if (disabled || active) return <span className={className} aria-disabled={disabled || undefined} aria-current={active ? 'page' : undefined}>{children}</span>

  return (
    <Link href={href} onNavigate={(event) => { event.preventDefault(); navigate(href) }} className={className}>
      {children}
    </Link>
  )
}
