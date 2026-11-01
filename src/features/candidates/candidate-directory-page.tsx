'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  Award,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FolderOpen,
  MapPin,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react'
import {
  formatCandidateRating,
  getCandidateLocation,
  getCandidateSkillNames,
  getCandidateSummary,
} from './candidate-directory'
import { ConnectionActions } from '@/features/connections/connect-button'
import { FeedAvatar } from '@/features/feed/feed-avatar'
import { skillsApi, usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn } from '@/shared/lib/utils'
import type { CandidateProfile } from '@/shared/schemas'
import { Badge, Button, ButtonLink, Card, CardContent, CardSkeleton, EmptyState, Input } from '@/shared/ui'

const pageSize = 12

export function CandidateDirectoryPage() {
  const searchParams = useSearchParams()
  const initialKeyword = searchParams.get('keyword') ?? ''

  return <CandidateDirectoryContent key={initialKeyword} initialKeyword={initialKeyword} />
}

function CandidateDirectoryContent({ initialKeyword }: { initialKeyword: string }) {
  const [keyword, setKeyword] = useState(initialKeyword)
  const [skill, setSkill] = useState('')
  const [location, setLocation] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialKeyword.trim())
  const [debouncedSkill, setDebouncedSkill] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')
  const [page, setPage] = useState(1)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim())
      setDebouncedSkill(skill.trim())
      setDebouncedLocation(location.trim())
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [keyword, location, skill])

  const params = useMemo(
    () => ({
      page,
      pageSize,
      keyword: debouncedKeyword || undefined,
      skill: debouncedSkill || undefined,
      location: debouncedLocation || undefined,
    }),
    [debouncedKeyword, debouncedLocation, debouncedSkill, page]
  )
  const query = useQuery({
    queryKey: queryKeys.candidates(params),
    queryFn: () => usersApi.candidates(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  })
  const skillsQuery = useQuery({
    queryKey: ['skills', 'candidates'],
    queryFn: skillsApi.all,
    staleTime: 5 * 60 * 1000,
  })
  const content = query.data?.content
  const candidates = content?.data ?? []
  const total = content?.totalRow ?? 0
  const totalPages = content?.totalPages ?? 1
  const popularSkills = skillsQuery.data?.content?.slice(0, 8) ?? []

  function clearFilters() {
    setKeyword('')
    setSkill('')
    setLocation('')
    setDebouncedKeyword('')
    setDebouncedSkill('')
    setDebouncedLocation('')
    setPage(1)
  }

  function updateKeyword(value: string) {
    setKeyword(value)
    setPage(1)
  }

  function updateSkill(value: string) {
    setSkill(value)
    setPage(1)
  }

  function updateLocation(value: string) {
    setLocation(value)
    setPage(1)
  }

  function submitKeyword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDebouncedKeyword(keyword.trim())
    setPage(1)
  }

  const activeFilters = [
    skill.trim() ? { key: 'skill' as const, label: skill.trim(), onRemove: () => updateSkill('') } : null,
    location.trim() ? { key: 'location' as const, label: location.trim(), onRemove: () => updateLocation('') } : null,
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter))

  return (
    <div className="container-page pt-10 pb-16">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
        <Users className="h-3.5 w-3.5" /> Employer workspace
      </p>
      <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight">Find candidates</h1>

      <form
        onSubmit={submitKeyword}
        className="mt-5 flex max-w-2xl items-stretch overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition focus-within:border-primary"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4">
          <Search className="h-5 w-5 shrink-0 text-muted" />
          <Input
            className="h-[52px] border-0 bg-transparent px-0 shadow-none ring-0 focus:border-0 focus:ring-0"
            placeholder="Search by name, role, or project type…"
            aria-label="Search candidates"
            value={keyword}
            onChange={(event) => updateKeyword(event.target.value)}
          />
        </div>
        <button type="submit" className="flex shrink-0 items-center gap-2 bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-bright">
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Popular skills">
        <SkillChip label="All skills" active={!skill.trim()} onClick={() => updateSkill('')} />
        {popularSkills.map((popularSkill) => (
          <SkillChip
            key={popularSkill}
            label={popularSkill}
            active={skill.trim().toLowerCase() === popularSkill.toLowerCase()}
            onClick={() => updateSkill(skill.trim().toLowerCase() === popularSkill.toLowerCase() ? '' : popularSkill)}
          />
        ))}
      </nav>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <p className="text-sm text-muted" aria-live="polite">
          <b className="font-bold text-foreground">{query.isPending && !content ? '…' : total}</b> discoverable candidates
        </p>
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.onRemove}
              title="Remove filter"
              className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-xs font-semibold text-foreground transition hover:border-danger hover:text-danger"
            >
              {filter.label}
              <X className="h-3 w-3 text-muted" />
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-controls="candidate-filter-panel"
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-semibold transition',
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
          <ButtonLink href="/recommendations/candidates">
            <Sparkles className="h-4 w-4" />
            AI matching
          </ButtonLink>
        </div>
      </div>

      {panelOpen ? (
        <Card id="candidate-filter-panel" className="mt-3 p-4 sm:p-5">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setPanelOpen(false)
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <PanelField label="Skill">
                <Input
                  className="h-8 border-0 bg-transparent px-0 shadow-none ring-0 focus:border-0 focus:ring-0"
                  placeholder="e.g. React, Figma, SEO"
                  aria-label="Filter by skill"
                  value={skill}
                  onChange={(event) => updateSkill(event.target.value)}
                />
              </PanelField>
              <PanelField label="Location">
                <Input
                  className="h-8 border-0 bg-transparent px-0 shadow-none ring-0 focus:border-0 focus:ring-0"
                  placeholder="e.g. Ho Chi Minh, Remote"
                  aria-label="Filter by location"
                  value={location}
                  onChange={(event) => updateLocation(event.target.value)}
                />
              </PanelField>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
              <Button type="submit">Apply filters</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <section className="mt-6" aria-busy={query.isPending} aria-live="polite">
        {query.isPending ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)}
          </div>
        ) : candidates.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)}
          </div>
        ) : query.isError ? (
          <EmptyState
            icon={<SearchX />}
            title="Unable to load candidates"
            description="Refresh the page or try again after the backend is available."
            action={<Button variant="secondary" onClick={() => query.refetch()}>Retry</Button>}
          />
        ) : debouncedSkill || debouncedLocation || debouncedKeyword ? (
          <EmptyState
            icon={<SearchX />}
            title="No matching candidates"
            description="Adjust the filters or clear them to return to the full candidate directory."
            action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            icon={<Users />}
            title="No discoverable candidates yet"
            description="Workers choose to be discoverable in their Settings. Share JobAura with talent you trust, or try AI matching on your hiring posts."
            action={<ButtonLink href="/recommendations/candidates">Open AI matching</ButtonLink>}
          />
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" disabled={page <= 1 || query.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </Button>
          <span className="text-sm font-semibold text-muted">
            Page {page} of {Math.max(totalPages, 1)}
          </span>
          <Button type="button" variant="secondary" disabled={page >= totalPages || query.isFetching} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </section>
    </div>
  )
}

function SkillChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition',
        active ? 'border-foreground bg-foreground text-white' : 'border-border bg-surface text-muted hover:border-primary hover:text-primary'
      )}
    >
      {label}
    </button>
  )
}

function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="flex h-10 items-center rounded-lg border border-border bg-surface px-3 transition focus-within:border-primary">
        {children}
      </span>
    </label>
  )
}

function CandidateCard({ candidate }: { candidate: CandidateProfile }) {
  const skills = getCandidateSkillNames(candidate)
  const summary = getCandidateSummary(candidate)
  const isMatch = candidate.match.label !== 'low_match'

  return (
    <Card className="transition hover:shadow-[0_12px_28px_rgba(27,28,28,0.09)]">
      <CardContent className="flex flex-col gap-3 p-4.5">
        <div className="flex items-start gap-3">
          <FeedAvatar user={candidate} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-bold">
              <Link href={`/profile/${candidate.id}`} className="block truncate hover:text-primary">{candidate.name}</Link>
            </h2>
            <p className="mt-0.5 truncate text-sm font-semibold text-muted">{candidate.headline}</p>
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold',
              isMatch ? 'bg-primary/10 text-primary' : 'bg-surface-muted text-muted'
            )}
          >
            {isMatch ? <Sparkles className="h-3 w-3" /> : null}
            {isMatch ? 'Match' : 'No match yet'}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {getCandidateLocation(candidate)}</span>
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-rating text-rating" /> {formatCandidateRating(candidate)}</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Open to work</span>
        </div>

        {summary ? <p className="line-clamp-2 text-sm leading-6 text-muted">{summary}</p> : null}

        {skills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 4).map((skill) => (
              <Badge key={skill} tone="accent">{skill}</Badge>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2 border-y border-border py-2.5">
          <CardStat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Completed" value={String(candidate.stats.completedWork)} />
          <CardStat icon={<Award className="h-3.5 w-3.5" />} label="Certs" value={String(candidate.stats.certifications)} />
          <CardStat icon={<FolderOpen className="h-3.5 w-3.5" />} label="Portfolio" value={String(candidate.stats.portfolioItems)} />
        </div>

        <div className="flex items-center gap-2 text-[11.5px] font-semibold text-muted">
          Profile quality
          <span
            className="h-1.5 max-w-32 flex-1 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-label="Profile quality"
            aria-valuenow={Math.round(candidate.match.qualityScore * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="block h-full rounded-full bg-gradient-to-r from-primary to-primary-bright"
              style={{ width: `${Math.round(candidate.match.qualityScore * 100)}%` }}
            />
          </span>
          {Math.round(candidate.match.qualityScore * 100)}%
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/profile/${candidate.id}`} className="flex-1" variant="secondary">
            View profile
            <ArrowUpRight className="h-4 w-4" />
          </ButtonLink>
          <ConnectionActions className="flex-1" userId={candidate.id} userName={candidate.name} />
        </div>
      </CardContent>
    </Card>
  )
}

function CardStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-sm font-bold">
        <span className="text-primary">{icon}</span>
        {value}
      </div>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-muted">{label}</p>
    </div>
  )
}
