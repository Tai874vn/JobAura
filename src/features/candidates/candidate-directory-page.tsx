'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ListOrdered, MapPin, Search, SearchX, Users, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/features/auth/use-session'
import { OccupationPicker, useOccupationTitle } from '@/features/occupations/occupation-picker'
import { skillsApi, usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import {
  BrowseHero,
  BrowsePage,
  ButtonLink,
  EmptyState,
  ExploreChip,
  ExploreRow,
  FilterChoice,
  FilterGroup,
  FilterPanel,
  FiltersToggle,
  InfoTip,
  Pagination,
  ResultsHeader,
  shownRange,
} from '@/shared/ui'
import { CandidateConnectButton } from './candidate-connect-button'
import {
  buildCandidatesHref,
  candidateLevels,
  candidateMinYearsPresets,
  candidatesPageSize,
  countActiveCandidateFilters,
  minYearsLabel,
  readCandidateFilters,
  resolveOutOfRangePage,
  toCandidateSearchParams,
  type CandidateListFilters,
} from './candidate-directory'
import { CandidateResultCard } from './candidate-result-card'

const EXPLORE_SKILLS_LIMIT = 6

/**
 * Discoverable candidates (/candidates, employers and admins) on the shared BrowsePage shell:
 * a hero with AI matching, a sticky search bar (keyword + location), an optional Explore row of popular skills,
 * a left filter sidebar (popover on phones), stacked candidate result cards, and prev/next pagination.
 * Every filter lives in the URL so filtered searches can be shared or restored with Back/Forward.
 */
export function CandidateDirectoryPage() {
  const router = useRouter()
  const pathname = usePathname() || '/candidates'
  const searchParams = useSearchParams()
  const { user } = useSession()

  const parsed = readCandidateFilters(searchParams)
  const { page, ...applied } = parsed

  // Keep text inputs synced with the URL when a chip, Reset, or browser Back/Forward updates the address.
  const [keyword, setKeyword] = useState(applied.keyword)
  const [syncedKeyword, setSyncedKeyword] = useState(applied.keyword)
  if (syncedKeyword !== applied.keyword) {
    setSyncedKeyword(applied.keyword)
    setKeyword(applied.keyword)
  }

  const [location, setLocation] = useState(applied.location)
  const [syncedLocation, setSyncedLocation] = useState(applied.location)
  if (syncedLocation !== applied.location) {
    setSyncedLocation(applied.location)
    setLocation(applied.location)
  }

  const [skillDraft, setSkillDraft] = useState(applied.skill)
  const [syncedSkill, setSyncedSkill] = useState(applied.skill)
  if (syncedSkill !== applied.skill) {
    setSyncedSkill(applied.skill)
    setSkillDraft(applied.skill)
  }

  const appliedMinYearsText = applied.minYears !== undefined ? String(applied.minYears) : ''
  const [minYearsDraft, setMinYearsDraft] = useState(appliedMinYearsText)
  const [syncedMinYears, setSyncedMinYears] = useState(appliedMinYearsText)
  if (syncedMinYears !== appliedMinYearsText) {
    setSyncedMinYears(appliedMinYearsText)
    setMinYearsDraft(appliedMinYearsText)
  }

  const [showFilters, setShowFilters] = useState(false)

  const apiParams = toCandidateSearchParams(applied, page)
  const query = useQuery({
    queryKey: queryKeys.candidates(apiParams, user?.id),
    queryFn: () => usersApi.candidates(apiParams),
    // Keep the current cards on screen while the next filter or page loads instead of flashing a skeleton.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
  const skillsQuery = useQuery({
    queryKey: ['skills', 'candidates'],
    queryFn: skillsApi.all,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const occupationTitle = useOccupationTitle(applied.occupation)
  const content = query.data?.content
  const candidates = content?.data ?? []
  const total = content?.totalRow ?? 0
  const totalPages = Math.max(1, content?.totalPages ?? (Math.ceil(total / candidatesPageSize) || 1))
  const shown = shownRange(page, candidatesPageSize, total)

  // If the user opened a ?page= past the last page and we know the total, jump to the last page.
  const pageStatus =
    !query.isPending && !query.isError && !query.isPlaceholderData
      ? resolveOutOfRangePage({
          page,
          itemCount: candidates.length,
          totalRow: content?.totalRow,
          totalPages: content?.totalPages,
        })
      : { action: 'ok' as const }
  const clampedHref =
    pageStatus.action === 'clamp'
      ? buildCandidatesHref(pathname, applied, pageStatus.targetPage)
      : null

  useEffect(() => {
    if (!clampedHref) return
    router.replace(clampedHref, { scroll: false })
  }, [clampedHref, router])

  const popularSkills = (skillsQuery.data?.content ?? []).slice(0, EXPLORE_SKILLS_LIMIT)
  const sidebarSkills = applied.skill && !popularSkills.some((item) => item.toLowerCase() === applied.skill.toLowerCase())
    ? [...popularSkills, applied.skill]
    : popularSkills

  const activeFilterCount = countActiveCandidateFilters(applied)
  const searching = activeFilterCount > 0 || Boolean(applied.keyword)
  const isCustomMinYears =
    applied.minYears !== undefined &&
    !(candidateMinYearsPresets as readonly number[]).includes(applied.minYears)

  function go(next: Partial<CandidateListFilters>, nextPage = 1) {
    const merged: CandidateListFilters = { ...applied, ...next }
    if (!merged.occupation.trim()) merged.includeRelated = false
    router.replace(buildCandidatesHref(pathname, merged, nextPage), { scroll: false })
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    go({ keyword, location })
  }

  function applySkillDraft() {
    const trimmed = skillDraft.trim()
    if (trimmed !== applied.skill) go({ skill: trimmed })
  }

  function applyLocationDraft() {
    const trimmed = location.trim()
    if (trimmed !== applied.location) go({ location: trimmed })
  }

  function applyMinYearsDraft() {
    const trimmed = minYearsDraft.trim()
    if (!trimmed) {
      if (applied.minYears !== undefined) go({ minYears: undefined })
      return
    }
    const parsedYears = Number(trimmed)
    if (!Number.isFinite(parsedYears) || parsedYears <= 0) {
      setMinYearsDraft('')
      if (applied.minYears !== undefined) go({ minYears: undefined })
      return
    }
    const clamped = Math.min(40, Math.floor(parsedYears))
    setMinYearsDraft(String(clamped))
    if (clamped !== applied.minYears) go({ minYears: clamped })
  }

  function reset() {
    setKeyword('')
    setLocation('')
    setSkillDraft('')
    setMinYearsDraft('')
    go({
      keyword: '',
      location: '',
      skill: '',
      occupation: '',
      includeRelated: false,
      level: '',
      minYears: undefined,
      hasPortfolio: false,
      hasCertification: false,
    })
  }

  return (
    <BrowsePage
      resultsKey={searchParams.toString()}
      resultsReady={Boolean(query.data)}
      hero={
        <BrowseHero
          title="Find candidates"
          intro="Discoverable talent on JobAura. Search by name, role, skill, or location, then narrow by occupation, AI level, and experience."
          action={
            <ButtonLink
              href="/recommendations/candidates"
              variant="secondary"
              className="h-[42px] border-[#c5d8c8] px-5 font-semibold text-primary"
            >
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
              AI matching
            </ButtonLink>
          }
        />
      }
      search={
        <form
          onSubmit={submitSearch}
          role="search"
          aria-label="Search candidates"
          className="field-shell flex min-w-0 items-center gap-2 rounded-xl border border-[#d1ddd1] bg-surface p-2 sm:h-[68px] sm:pl-3"
        >
          <label className="flex min-w-0 flex-[3] items-center gap-2.5 px-2">
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Name, role, skill, or project"
              aria-label="Keyword"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
          </label>
          <span className="hidden h-7 w-px bg-border md:block" aria-hidden="true" />
          <label className="hidden min-w-0 flex-[2] items-center gap-2 px-2 md:flex">
            <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Location (e.g. Ho Chi Minh, Remote)"
              aria-label="Location"
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
        popularSkills.length ? (
          <ExploreRow>
            {popularSkills.map((popularSkill) => {
              const active = applied.skill.toLowerCase() === popularSkill.toLowerCase()
              return (
                <ExploreChip
                  key={popularSkill}
                  active={active}
                  onClick={() => go({ skill: active ? '' : popularSkill })}
                >
                  {popularSkill}
                </ExploreChip>
              )
            })}
          </ExploreRow>
        ) : undefined
      }
      filtersOpen={showFilters}
      filters={
        <FilterPanel intro="Narrow down candidates by occupation, level, and skills." onReset={reset} canReset={searching}>
          <FilterGroup title="Occupation">
            <OccupationPicker
              compact
              hideLabel
              label="Main occupation"
              value={applied.occupation}
              emptyLabel="Any occupation"
              placeholder="e.g. web developer"
              onPick={(hit) => go({ occupation: hit.code })}
              onClear={() => go({ occupation: '', includeRelated: false })}
            />
            <div className="flex items-center gap-1.5">
              <label
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 text-[13px]',
                  applied.occupation ? 'text-foreground' : 'cursor-not-allowed text-muted',
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={applied.includeRelated}
                  disabled={!applied.occupation}
                  onChange={(event) => go({ includeRelated: event.target.checked })}
                />
                Include related occupations
              </label>
              <InfoTip
                label="What related occupations are"
                text="Also candidates whose main occupation shares many ESCO skill groups with this one (at least 25%), for example software developer for web developer."
              />
            </div>
          </FilterGroup>

          {/* The backend matches one AI seniority level at a time and does not return facet counts. */}
          <FilterGroup title="AI level">
            <FilterChoice
              label="All levels"
              checked={!applied.level}
              onChange={() => go({ level: '' })}
            />
            {candidateLevels.map((level) => (
              <FilterChoice
                key={level}
                label={level}
                checked={applied.level === level}
                onChange={() => go({ level: applied.level === level ? '' : level })}
              />
            ))}
          </FilterGroup>

          <FilterGroup title={minYearsLabel(applied.occupation ? occupationTitle : null)}>
            <FilterChoice
              label="Any experience"
              checked={applied.minYears === undefined}
              onChange={() => go({ minYears: undefined })}
            />
            {candidateMinYearsPresets.map((years) => (
              <FilterChoice
                key={years}
                label={`${years}+ years`}
                checked={applied.minYears === years}
                onChange={() => go({ minYears: applied.minYears === years ? undefined : years })}
              />
            ))}
            {isCustomMinYears ? (
              <FilterChoice
                label={`${applied.minYears}+ years`}
                checked
                onChange={() => go({ minYears: undefined })}
              />
            ) : null}
            <label className="grid gap-1 pt-1">
              <span className="text-xs text-muted">Minimum years (0–40)</span>
              <input
                type="number"
                min={0}
                max={40}
                inputMode="numeric"
                value={minYearsDraft}
                placeholder="Any"
                aria-label="Minimum years of experience"
                onChange={(event) => setMinYearsDraft(event.target.value)}
                onBlur={applyMinYearsDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    applyMinYearsDraft()
                  }
                }}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </FilterGroup>

          <div className={cn(!applied.hasPortfolio && !applied.hasCertification && '[&>fieldset]:md:pb-0')}>
            <FilterGroup title="Skill">
              <div className="relative">
                <input
                  value={skillDraft}
                  onChange={(event) => setSkillDraft(event.target.value)}
                  onBlur={applySkillDraft}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      applySkillDraft()
                    }
                  }}
                  placeholder="e.g. React, Figma, SEO"
                  aria-label="Filter by skill"
                  className={cn(
                    'h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
                    skillDraft && 'pr-8',
                  )}
                />
                {skillDraft ? (
                  <button
                    type="button"
                    aria-label="Clear skill filter"
                    onClick={() => {
                      setSkillDraft('')
                      go({ skill: '' })
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {sidebarSkills.length ? (
                <>
                  <FilterChoice
                    label="All skills"
                    checked={!applied.skill}
                    onChange={() => go({ skill: '' })}
                  />
                  {sidebarSkills.map((item) => {
                    const checked = applied.skill.toLowerCase() === item.toLowerCase()
                    return (
                      <FilterChoice
                        key={item}
                        label={item}
                        checked={checked}
                        onChange={() => go({ skill: checked ? '' : item })}
                      />
                    )
                  })}
                </>
              ) : null}
            </FilterGroup>
          </div>

          {/* Below md the search bar hides Location, so the phone filter popover shows it here instead. */}
          <div className="md:hidden">
            <FilterGroup title="Location" last={!applied.hasPortfolio && !applied.hasCertification}>
              <div className="relative">
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  onBlur={applyLocationDraft}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      applyLocationDraft()
                    }
                  }}
                  placeholder="e.g. Ho Chi Minh, Remote"
                  aria-label="Filter by location"
                  className={cn(
                    'h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
                    location && 'pr-8',
                  )}
                />
                {location ? (
                  <button
                    type="button"
                    aria-label="Clear location filter"
                    onClick={() => {
                      setLocation('')
                      go({ location: '' })
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </FilterGroup>
          </div>

          {applied.hasPortfolio || applied.hasCertification ? (
            <FilterGroup title="Profile" last>
              {applied.hasPortfolio ? (
                <FilterChoice
                  label="Has portfolio"
                  checked
                  onChange={() => go({ hasPortfolio: false })}
                />
              ) : null}
              {applied.hasCertification ? (
                <FilterChoice
                  label="Has certifications"
                  checked
                  onChange={() => go({ hasCertification: false })}
                />
              ) : null}
            </FilterGroup>
          ) : null}
        </FilterPanel>
      }
      toolbar={
        <ResultsHeader
          title={
            query.isPending
              ? 'Loading candidates…'
              : `${total.toLocaleString('en-US')} ${total === 1 ? 'candidate' : 'candidates'}`
          }
          // GET /api/users/candidates has no sort parameter (it ranks each page by match score), so no sort menu is shown.
          actions={
            <FiltersToggle
              open={showFilters}
              onToggle={() => setShowFilters((value) => !value)}
              count={activeFilterCount}
            />
          }
          summary={
            candidates.length && total
              ? `Showing ${shown.first.toLocaleString('en-US')}–${shown.last.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} discoverable candidates`
              : null
          }
        />
      }
      results={
        query.isPending ? (
          <div role="status" aria-label="Loading candidates" className="mt-4 grid gap-4">
            <span className="sr-only">Loading candidates</span>
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-xl border border-border bg-surface"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : query.isError ? (
          <div className="mt-4">
            <EmptyState
              icon={<SearchX />}
              title="Candidates could not be loaded"
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
        ) : candidates.length ? (
          <ul
            className={cn(
              'mt-4 grid gap-4 transition-opacity duration-200',
              query.isPlaceholderData && 'opacity-60',
            )}
            aria-busy={query.isPlaceholderData}
            aria-label="Candidates"
          >
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <CandidateResultCard
                  candidate={candidate}
                  viewer={user}
                  connectAction={<CandidateConnectButton userId={candidate.id} userName={candidate.name} />}
                />
              </li>
            ))}
          </ul>
        ) : page > 1 ? (
          <div className="mt-4">
            <EmptyState
              icon={<SearchX />}
              title="No candidates on this page."
              description="This page is past the end of the results."
              action={
                <ButtonLink href={buildCandidatesHref(pathname, applied, 1)}>
                  Back to page 1
                </ButtonLink>
              }
            />
          </div>
        ) : searching ? (
          <div className="mt-4">
            <EmptyState
              icon={<SearchX />}
              title="No matching candidates"
              description="Try fewer filters or a different keyword."
              action={
                <button
                  type="button"
                  onClick={reset}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Clear filters
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={<Users />}
              title="No discoverable candidates yet"
              description="Candidates choose to be discoverable in their Settings. Share JobAura with talent you trust, or try AI matching on your hiring posts."
              action={<ButtonLink href="/recommendations/candidates">Open AI matching</ButtonLink>}
            />
          </div>
        )
      }
      pagination={
        !query.isPending && !query.isError && candidates.length ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={(next) => go({}, next)}
            label="Candidate pages"
            boxed
          />
        ) : undefined
      }
    />
  )
}
