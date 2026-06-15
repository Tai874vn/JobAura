'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Award,
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FolderOpen,
  MapPin,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Star,
  Users,
} from 'lucide-react'
import {
  candidateLocationOptions,
  candidateSkillOptions,
  demoCandidates,
  filterCandidates,
  type CandidateAvailability,
  type CandidateLevel,
  type CandidateProfile,
} from './candidate-directory'
import { initials } from '@/shared/lib/utils'
import { Badge, Button, Card, CardContent, Input } from '@/shared/ui'

const levels: Array<{ value: CandidateLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
]

const availabilityText: Record<CandidateAvailability, string> = {
  available: 'Available now',
  open_soon: 'Open soon',
  busy: 'Booked',
}

export function CandidateDirectoryPage() {
  const [keyword, setKeyword] = useState('')
  const [skill, setSkill] = useState('')
  const [location, setLocation] = useState('')
  const [level, setLevel] = useState<CandidateLevel | 'all'>('all')
  const [availableOnly, setAvailableOnly] = useState(false)

  const candidates = useMemo(
    () => filterCandidates(demoCandidates, { keyword, skill, location, level, availableOnly }),
    [availableOnly, keyword, level, location, skill]
  )
  const shortlisted = demoCandidates.slice(0, 3)

  function clearFilters() {
    setKeyword('')
    setSkill('')
    setLocation('')
    setLevel('all')
    setAvailableOnly(false)
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
            Browse verified JobAura talent before starting AI matching.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/jobs">
            <Button variant="secondary">Explore jobs</Button>
          </Link>
          <Link href="/jobs/new">
            <Button>
              <BriefcaseBusiness className="h-4 w-4" />
              Post a job
            </Button>
          </Link>
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
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
            <select
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-semibold outline-none focus:border-primary"
              value={skill}
              onChange={(event) => setSkill(event.target.value)}
            >
              <option value="">Any skill</option>
              {candidateSkillOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-semibold outline-none focus:border-primary"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">Any location</option>
              {candidateLocationOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-muted p-1">
              {levels.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`h-8 rounded px-3 text-xs font-bold transition ${
                    level === option.value ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'
                  }`}
                  onClick={() => setLevel(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={availableOnly}
                  onChange={(event) => setAvailableOnly(event.target.checked)}
                />
                Available now
              </label>
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
            <p className="text-sm font-bold">{candidates.length} candidates</p>
            <p className="text-xs font-semibold text-muted">Candidate directory</p>
          </div>
          {candidates.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)}
            </div>
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
        </section>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Shortlist</p>
                  <h2 className="font-display text-xl font-bold">Saved candidates</h2>
                </div>
                <Bookmark className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 divide-y divide-border">
                {shortlisted.map((candidate) => (
                  <Link key={candidate.id} href={`/profile/${candidate.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                      {initials(candidate.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{candidate.name}</span>
                      <span className="block truncate text-xs text-muted">{candidate.headline}</span>
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-surface-muted p-3 text-xs leading-5 text-muted">
                Keep a focused review list while comparing availability, skills, and recent work.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function CandidateCard({ candidate }: { candidate: CandidateProfile }) {
  const availabilityTone = candidate.availability === 'available' ? 'primary' : candidate.availability === 'open_soon' ? 'accent' : 'neutral'

  return (
    <Card className="transition hover:border-primary">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-white">
            {initials(candidate.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-bold">{candidate.name}</h2>
                <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-muted">{candidate.headline}</p>
              </div>
              <Badge tone={availabilityTone}>{availabilityText[candidate.availability]}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {candidate.location}</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {candidate.responseTime}</span>
              <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-rating" /> {candidate.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">{candidate.summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {candidate.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded bg-accent/30 px-2 py-1 text-xs font-bold text-foreground">{skill}</span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-xs">
          <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={String(candidate.completedWork)} />
          <Metric icon={<Award className="h-4 w-4" />} label="Certs" value={String(candidate.certifications)} />
          <Metric icon={<FolderOpen className="h-4 w-4" />} label="Portfolio" value={String(candidate.portfolioItems)} />
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">{candidate.reason}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/profile/${candidate.id}`} className="flex-1">
            <Button className="w-full" variant="secondary">
              View profile
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button className="flex-1" type="button">
            <MessageSquare className="h-4 w-4" />
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
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
