'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { replaceUrlInPlace } from '@/shared/lib/replace-url'
import { ArrowDownWideNarrow, BriefcaseBusiness, ChevronDown, Plus, Search, SearchX } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/features/auth/use-session'
import { NewProposalDialog } from '@/features/contracts/components/proposal/new-proposal-dialog'
import { categoriesApi, jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import type { Job } from '@/shared/schemas'
import {
  BrowseHero,
  BrowsePage,
  ButtonLink,
  ChoiceMenu,
  EmptyState,
  ExploreChip,
  ExploreRow,
  FilterChoice,
  FilterGroup,
  FilterPanel,
  FiltersToggle,
  Pagination,
  ResultsHeader,
  shownRange,
} from '@/shared/ui'
import { JobCategoryNav } from './job-category-nav'
import { JobResultCard } from './job-result-card'
import { JobResultsSkeleton } from './job-results-skeleton'
import {
  activePriceRangeId,
  buildJobsHref,
  canPostPortfolio,
  categoryNameForJob,
  countActiveJobFilters,
  customPriceRangeLabel,
  jobPriceRanges,
  jobSortLabels,
  jobSorts,
  jobsPageSize,
  popularPortfolioTerms,
  readJobListFilters,
  toJobSearchParams,
  type JobListFilters,
  type JobPriceRange,
  type JobSort,
} from '../../utils/jobs-browse-view'

const postPortfolioButton =
  'interaction inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-[#066a48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

const SIDEBAR_CATEGORY_LIMIT = 8

/**
 * Candidate portfolios (/jobs) on the shared BrowsePage shell:
 * a hero with Post portfolio (candidates and admins), a sticky keyword search bar,
 * an Explore band with popular terms and category navigation, a left filter sidebar
 * (popover on phones), a results column of cards, and prev/next pagination.
 */
export function JobListView() {
  const pathname = usePathname() || '/jobs'
  const searchParams = useSearchParams()
  const { user } = useSession()
  const canPost = canPostPortfolio(user?.role)

  const parsed = readJobListFilters(searchParams)
  const { page, ...applied } = parsed

  // Keep the text box synced with the URL whenever a chip, Reset, or browser Back/Forward changes it.
  const [keyword, setKeyword] = useState(applied.keyword)
  const [syncedKeyword, setSyncedKeyword] = useState(applied.keyword)
  if (syncedKeyword !== applied.keyword) {
    setSyncedKeyword(applied.keyword)
    setKeyword(applied.keyword)
  }

  const [showFilters, setShowFilters] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [proposalJob, setProposalJob] = useState<Job | null>(null)

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoriesApi.all,
    staleTime: 5 * 60 * 1000,
  })
  const categories = categoriesQuery.data?.content ?? []

  // Find the active category (or infer it from a selected subcategory so specialty choices stay visible).
  const activeCategory = applied.categoryId !== undefined
    ? categories.find((category) => category.id === applied.categoryId)
    : applied.subcategoryId !== undefined
      ? categories.find((category) => category.subcategories?.some((sub) => sub.id === applied.subcategoryId))
      : undefined
  const subcategories = activeCategory?.subcategories ?? []

  // Show the first 8 categories in the sidebar plus the chosen one, with a toggle for the rest.
  const visibleSidebarCategories = showAllCategories ? categories : categories.slice(0, SIDEBAR_CATEGORY_LIMIT)
  const selectedSidebarCategory = categories.find((category) => category.id === applied.categoryId)
  const sidebarCategories = selectedSidebarCategory && !visibleSidebarCategories.includes(selectedSidebarCategory)
    ? [...visibleSidebarCategories, selectedSidebarCategory]
    : visibleSidebarCategories
  const hiddenCategoryCount = categories.length - sidebarCategories.length

  const apiParams = toJobSearchParams(applied, page)
  const query = useQuery({
    queryKey: queryKeys.jobs(apiParams),
    queryFn: () => jobsApi.paginated(apiParams),
    // Keep the current cards visible while the next filter or page loads instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  })

  const content = query.data?.content
  const jobs = content?.data ?? []
  const total = content?.totalRow ?? 0
  const calculatedTotalPages = Math.ceil(total / jobsPageSize) || 1
  const totalPages = Math.max(1, content?.totalPages ?? calculatedTotalPages)
  const shown = shownRange(page, jobsPageSize, total)

  const activeFilterCount = countActiveJobFilters(applied)
  const searching = activeFilterCount > 0 || Boolean(applied.keyword)
  const priceRangeId = activePriceRangeId(applied.minPrice, applied.maxPrice)

  function go(next: Partial<JobListFilters>, nextPage = 1) {
    const merged: JobListFilters = { ...applied, ...next }
    replaceUrlInPlace(buildJobsHref(pathname, merged, nextPage))
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    go({ keyword })
  }

  function selectCategory(categoryId?: number) {
    go({ categoryId, subcategoryId: undefined })
  }

  function togglePriceRange(range: JobPriceRange) {
    if (priceRangeId === range.id) {
      go({ minPrice: undefined, maxPrice: undefined })
      return
    }
    go({ minPrice: range.minPrice, maxPrice: range.maxPrice })
  }

  function reset() {
    setKeyword('')
    go({
      keyword: '',
      categoryId: undefined,
      subcategoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
    })
  }

  return (
    <>
      <BrowsePage
        resultsKey={searchParams.toString()}
        resultsReady={Boolean(query.data)}
        hero={
          <BrowseHero
            title="Candidate portfolios"
            intro="Work samples and priced services from candidates on JobAura. Search by role, skill, or name, then narrow by field and price."
            action={
              canPost ? (
                <ButtonLink href="/jobs/new" className={postPortfolioButton}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Post portfolio
                </ButtonLink>
              ) : null
            }
          />
        }
        search={
          <form
            onSubmit={submitSearch}
            role="search"
            aria-label="Search candidate portfolios"
            className="field-shell flex min-w-0 items-center gap-2 rounded-xl border border-[#d1ddd1] bg-surface p-2 sm:h-[68px] sm:pl-3"
          >
            <label className="flex min-w-0 flex-1 items-center gap-2.5 px-2">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Role, skill, or candidate name"
                aria-label="Keyword"
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              />
            </label>
            <button
              type="submit"
              className="interaction inline-flex h-[42px] shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-[#066a48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-32"
            >
              Search
            </button>
          </form>
        }
        explore={
          <div className="grid gap-3">
            <ExploreRow>
              {popularPortfolioTerms.map((term) => {
                const active = applied.keyword.toLowerCase() === term.toLowerCase()
                return (
                  <ExploreChip
                    key={term}
                    active={active}
                    onClick={() => {
                      const nextKeyword = active ? '' : term
                      setKeyword(nextKeyword)
                      go({ keyword: nextKeyword })
                    }}
                  >
                    {term}
                  </ExploreChip>
                )
              })}
            </ExploreRow>

            <JobCategoryNav
              categories={categories}
              selectedId={applied.categoryId}
              loading={categoriesQuery.isPending}
              onSelect={selectCategory}
            />
          </div>
        }
        filtersOpen={showFilters}
        filters={
          <FilterPanel intro="Narrow down portfolios by field and budget." onReset={reset} canReset={searching}>
            {/* The categories endpoint does not send per-category counts, so counts are omitted here. */}
            <FilterGroup title="Category">
              <FilterChoice
                label="All categories"
                checked={applied.categoryId === undefined}
                onChange={() => selectCategory(undefined)}
              />
              {sidebarCategories.map((category) => {
                const checked = applied.categoryId === category.id
                return (
                  <FilterChoice
                    key={category.id}
                    label={category.name}
                    checked={checked}
                    onChange={() => selectCategory(checked ? undefined : category.id)}
                  />
                )
              })}
              {hiddenCategoryCount > 0 || showAllCategories ? (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((value) => !value)}
                  className="inline-flex w-fit items-center gap-1 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {showAllCategories ? 'Show fewer categories' : `Show more categories (${hiddenCategoryCount})`}
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', showAllCategories && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>
              ) : null}
            </FilterGroup>

            {subcategories.length ? (
              <FilterGroup title="Specialty">
                <FilterChoice
                  label="All specialties"
                  checked={applied.subcategoryId === undefined}
                  onChange={() => go({ subcategoryId: undefined })}
                />
                {subcategories.map((subcategory) => {
                  const checked = applied.subcategoryId === subcategory.id
                  return (
                    <FilterChoice
                      key={subcategory.id}
                      label={subcategory.name}
                      checked={checked}
                      onChange={() => go({ subcategoryId: checked ? undefined : subcategory.id })}
                    />
                  )
                })}
              </FilterGroup>
            ) : null}

            <FilterGroup title="Price" last>
              <FilterChoice
                label="All prices"
                checked={priceRangeId === ''}
                onChange={() => go({ minPrice: undefined, maxPrice: undefined })}
              />
              {jobPriceRanges.map((range) => (
                <FilterChoice
                  key={range.id}
                  label={range.label}
                  checked={priceRangeId === range.id}
                  onChange={() => togglePriceRange(range)}
                />
              ))}
              {priceRangeId === 'custom' ? (
                <FilterChoice
                  label={customPriceRangeLabel(applied.minPrice, applied.maxPrice)}
                  checked
                  onChange={() => go({ minPrice: undefined, maxPrice: undefined })}
                />
              ) : null}
            </FilterGroup>
          </FilterPanel>
        }
        toolbar={
          <ResultsHeader
            title={
              query.isPending
                ? 'Loading portfolios…'
                : `${total.toLocaleString('en-US')} ${total === 1 ? 'portfolio post' : 'portfolio posts'}`
            }
            actions={
              <>
                <FiltersToggle
                  open={showFilters}
                  onToggle={() => setShowFilters((value) => !value)}
                  count={activeFilterCount}
                />
                <ChoiceMenu
                  label="Sort"
                  prefix="Sort:"
                  value={applied.sort}
                  align="right"
                  buttonClassName="h-[42px] rounded-lg border border-transparent bg-surface px-3.5 text-sm font-semibold text-muted transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-primary"
                  icon={<ArrowDownWideNarrow className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  options={jobSorts.map((sort) => ({ value: sort, label: jobSortLabels[sort] }))}
                  onChange={(next) => go({ sort: next as JobSort })}
                />
              </>
            }
            summary={
              total
                ? `Showing ${shown.first.toLocaleString('en-US')}–${shown.last.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} portfolio posts`
                : null
            }
          />
        }
        results={
          query.isPending ? (
            <JobResultsSkeleton />
          ) : query.isError ? (
            <div className="mt-4">
              <EmptyState
                icon={<SearchX />}
                title="Portfolio posts could not be loaded"
                description={getErrorMessage(query.error, 'Check your connection and try again.')}
                action={
                  <button
                    type="button"
                    onClick={() => void query.refetch()}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Try again
                  </button>
                }
              />
            </div>
          ) : jobs.length ? (
            <ul
              // A new set of results is drawn fresh (key = the ids shown). Keeping and MOVING the cards that
              // appear in both sets slid them across the screen, which counted as layout shift (CLS).
              // Same idea in hiring-posts-page, my-hiring-posts-page and candidate-directory-page.
              key={jobs.map((job) => job.id).join(',')}
              className={cn(
                'results-in mt-4 grid gap-4 transition-opacity duration-200',
                query.isPlaceholderData && 'opacity-60',
              )}
              aria-busy={query.isPlaceholderData}
              aria-label="Candidate portfolios"
            >
              {jobs.map((job) => (
                <li key={job.id}>
                  <JobResultCard
                    job={job}
                    categoryName={categoryNameForJob(job, categories)}
                    viewer={user}
                    onPropose={setProposalJob}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={<BriefcaseBusiness />}
                title="No portfolio posts match"
                description={
                  searching
                    ? 'Try fewer filters or a different keyword.'
                    : 'Check back soon; candidates post new portfolios every week.'
                }
                action={
                  searching ? (
                    <button
                      type="button"
                      onClick={reset}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Clear filters
                    </button>
                  ) : undefined
                }
              />
            </div>
          )
        }
        pagination={
          !query.isPending && !query.isError && jobs.length ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={(next) => go({}, next)}
              label="Portfolio pages"
              boxed
            />
          ) : undefined
        }
      />

      {proposalJob ? <NewProposalDialog job={proposalJob} onClose={() => setProposalJob(null)} /> : null}
    </>
  )
}
