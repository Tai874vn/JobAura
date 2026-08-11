'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock3,
  FolderOpen,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import {
  formatCandidateRating,
  getCandidateLocation,
  getCandidateSkillNames,
  getCandidateSummary,
} from './candidate-directory'
import { ConnectionActions } from '@/features/connections/connect-button'
import { FeedAvatar } from '@/features/feed/feed-avatar'
import { usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn } from '@/shared/lib/utils'
import type { CandidateProfile } from '@/shared/schemas'
import { Button, ButtonLink, Card, CardContent, CardSkeleton, Input, Spinner } from '@/shared/ui'

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
  const content = query.data?.content
  const candidates = content?.data ?? []
  const total = content?.totalRow ?? 0
  const totalPages = content?.totalPages ?? 1

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

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary">
            <Users className="h-4 w-4" />
            Employer workspace
          </div>
          <h1 className="font-display text-4xl font-bold">Find candidates</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Search public worker profiles, review fit signals, and start hiring conversations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/recommendations/candidates">
            <Sparkles className="h-4 w-4" />
            AI matching
          </ButtonLink>
          <ButtonLink href="/connections" variant="secondary">
            <Users className="h-4 w-4" />
            Connections
          </ButtonLink>
          <ButtonLink href="/settings">
            <SlidersHorizontal className="h-4 w-4" />
            Hiring profile
          </ButtonLink>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="grid gap-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <Input
                className="pl-9"
                placeholder="Search by name, role, skill, or project type"
                value={keyword}
                onChange={(event) => updateKeyword(event.target.value)}
              />
            </label>
            <Input
              placeholder="Skill"
              value={skill}
              onChange={(event) => updateSkill(event.target.value)}
            />
            <Input
              placeholder="Location"
              value={location}
              onChange={(event) => updateLocation(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted">
              {query.isFetching ? <Spinner className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
              {total} completed profiles
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <SlidersHorizontal className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold">{total} candidates</p>
            <p className="text-xs font-semibold text-muted">Candidate directory</p>
          </div>
          {query.isPending ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)}
            </div>
          ) : candidates.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)}
            </div>
          ) : query.isError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <Search className="h-8 w-8 text-primary" />
                <h2 className="mt-3 font-display text-2xl font-bold">Unable to load candidates</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                  Refresh the page or try again after the backend is available.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <Search className="h-8 w-8 text-primary" />
                <h2 className="mt-3 font-display text-2xl font-bold">No matching candidates</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                  Adjust the filters or clear them to return to the full candidate directory.
                </p>
                <Button className="mt-4" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </CardContent>
            </Card>
          )}
          <div className="mt-5 flex items-center justify-between gap-3">
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

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Search focus</p>
                  <h2 className="font-display text-xl font-bold">Current filters</h2>
                </div>
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <FilterRow label="Keyword" value={keyword} />
                <FilterRow label="Skill" value={skill} />
                <FilterRow label="Location" value={location} />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function CandidateCard({ candidate }: { candidate: CandidateProfile }) {
  const skills = getCandidateSkillNames(candidate)
  const summary = getCandidateSummary(candidate)

  return (
    <Card className="transition hover:border-primary">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <FeedAvatar user={candidate} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-bold">{candidate.name}</h2>
                <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-muted">{candidate.headline}</p>
              </div>
              <CandidateFitBadge candidate={candidate} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {getCandidateLocation(candidate)}</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Profile complete</span>
              <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-rating" /> {formatCandidateRating(candidate)}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">{summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded bg-accent/30 px-2 py-1 text-xs font-bold text-foreground">{skill}</span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-xs">
          <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={String(candidate.stats.completedWork)} />
          <Metric icon={<Award className="h-4 w-4" />} label="Certs" value={String(candidate.stats.certifications)} />
          <Metric icon={<FolderOpen className="h-4 w-4" />} label="Portfolio" value={String(candidate.stats.portfolioItems)} />
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">Profile quality {Math.round(candidate.match.qualityScore * 100)}%</p>

        <div className="mt-4 flex flex-wrap gap-2">
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

function CandidateFitBadge({ candidate }: { candidate: CandidateProfile }) {
  const isMatch = candidate.match.label !== 'low_match'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-2.5 py-1 text-xs font-bold',
        isMatch ? 'bg-primary/10 text-primary' : 'bg-surface-muted text-muted',
      )}
    >
      {isMatch ? 'Match' : 'No match'}
    </span>
  )
}

function FilterRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="max-w-36 truncate font-semibold">{value.trim() || 'Any'}</span>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-primary">{icon}<span className="font-bold text-foreground">{value}</span></div>
      <p className="mt-1 truncate text-muted">{label}</p>
    </div>
  )
}
