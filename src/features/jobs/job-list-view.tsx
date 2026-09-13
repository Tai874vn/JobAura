'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { SearchX, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { jobTypesApi, jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { JobSearchParams } from '@/shared/schemas'
import { JobCard } from './job-card'
import { Button, ButtonLink, Card, CardContent, CardSkeleton, EmptyState, Input, PageHeader, Select } from '@/shared/ui'

const pageSize = 12

function pageWindow(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right)
}

export function JobListView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
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
  const activeFilterCount = [keyword, categoryId, subcategoryId, minPrice, maxPrice, minRating, sort].filter(Boolean).length

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (targetPage <= 1) params.delete('page')
    else params.set('page', String(targetPage))
    const queryString = params.toString()
    return queryString ? `/jobs?${queryString}` : '/jobs'
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params = new URLSearchParams(searchParams.toString())
    setParam(params, 'keyword', stringValue(data.get('keyword')))
    setParam(params, 'category', stringValue(data.get('category')))
    setParam(params, 'subcategory', stringValue(data.get('subcategory')))
    setParam(params, 'minPrice', stringValue(data.get('minPrice')))
    setParam(params, 'maxPrice', stringValue(data.get('maxPrice')))
    setParam(params, 'minRating', stringValue(data.get('minRating')))
    setParam(params, 'sort', stringValue(data.get('sort')))
    params.delete('page')
    const queryString = params.toString()
    router.push(queryString ? `/jobs?${queryString}` : '/jobs')
  }

  return (
    <div className="container-page py-8">
      <PageHeader
        className="mb-6"
        title="Explore services"
        description={keyword ? `Results for "${keyword}"` : 'Search and compare marketplace services.'}
        actions={
          <>
            <ButtonLink href="/recommendations/jobs">
              <Sparkles className="h-4 w-4" />
              AI recommendations
            </ButtonLink>
            <ButtonLink href="#service-filters" variant="secondary">
              <SlidersHorizontal className="h-4 w-4" />
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </ButtonLink>
          </>
        }
      />
      <Card id="service-filters" className="mb-6">
        <CardContent className="p-4">
          <form className="grid gap-3 lg:grid-cols-[1fr_180px_180px_120px_120px_140px_160px_auto]" onSubmit={applyFilters}>
            <Input name="keyword" defaultValue={keyword ?? ''} placeholder="Search services or sellers" aria-label="Search services or sellers" />
            <Select name="category" aria-label="Category" defaultValue={categoryId ?? ''}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.tenLoaiCongViec}</option>
              ))}
            </Select>
            <Select name="subcategory" aria-label="Subcategory" defaultValue={subcategoryId ?? ''}>
              <option value="">All specialties</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.tenChiTiet}</option>
              ))}
            </Select>
            <Input name="minPrice" type="number" min={0} defaultValue={minPrice ?? ''} placeholder="Min $" aria-label="Minimum price" />
            <Input name="maxPrice" type="number" min={0} defaultValue={maxPrice ?? ''} placeholder="Max $" aria-label="Maximum price" />
            <Select name="minRating" aria-label="Minimum rating" defaultValue={minRating ?? ''}>
              <option value="">Any rating</option>
              <option value="3">3+ stars</option>
              <option value="4">4+ stars</option>
              <option value="5">5 stars</option>
            </Select>
            <Select name="sort" aria-label="Sort services" defaultValue={sort ?? ''}>
              <option value="">Default</option>
              <option value="newest">Newest</option>
              <option value="rating_desc">Top rated</option>
              <option value="price_asc">Price low</option>
              <option value="price_desc">Price high</option>
            </Select>
            <div className="flex gap-2">
              <Button type="submit">Apply</Button>
              <ButtonLink href="/jobs" variant="secondary">
                Reset
              </ButtonLink>
            </div>
          </form>
        </CardContent>
      </Card>
      <section className="min-h-[1180px] sm:min-h-[980px] lg:min-h-[860px]" aria-busy={query.isPending} aria-live="polite">
        {query.isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: pageSize }).map((_, index) => <CardSkeleton key={index} />)}
          </div>
        ) : query.isError ? (
          <EmptyState
            icon={<SearchX />}
            title="Unable to load services"
            description="Check the backend connection and try again."
            action={<Button variant="secondary" onClick={() => query.refetch()}>Retry</Button>}
          />
        ) : jobs.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {jobs.map((job, index) => <JobCard key={job.id} job={job} priority={index === 0} />)}
            </div>
            <PaginationControls currentPage={page} totalPages={totalPages} pageHref={pageHref} />
          </>
        ) : (
          <EmptyState
            icon={<SearchX />}
            title="No services found"
            description="Try another keyword or clear some filters to see more results."
            action={<ButtonLink href="/jobs" variant="secondary">Clear filters</ButtonLink>}
          />
        )}
      </section>
    </div>
  )
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
    active ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-foreground hover:border-primary hover:text-primary',
    disabled ? 'pointer-events-none opacity-50' : '',
  ].join(' ')

  return (
    <Link href={disabled ? '#' : href} className={className} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  )
}
