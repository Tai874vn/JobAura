'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  MapPin,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConnectionActions } from '@/features/connections/connect-button'
import { FeedAvatar } from '@/features/feed/feed-avatar'
import { formatMatchScore, MatchBadge } from '@/features/jobs/recommendation-ui'
import { jobsApi, recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, currency, getErrorMessage } from '@/shared/lib/utils'
import type { Job, RecommendationContent, RecommendationQuota, RecommendedCandidate } from '@/shared/schemas'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Badge, Button, Card, CardContent, Spinner } from '@/shared/ui'

const jobPageParams = { page: 1, pageSize: 50 }
const topKOptions = [5, 10, 12]
const poolSizeOptions = [50, 100, 150]

type CandidateRunVariables = {
  jobId: number
  topK: number
  poolSize: number
}

export function RecommendedCandidatesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [manualSelectedJobId, setManualSelectedJobId] = useState<number | null>(null)
  const [resultJobId, setResultJobId] = useState<number | null>(null)
  const [lastContent, setLastContent] = useState<RecommendationContent<RecommendedCandidate> | null>(null)
  const [topK, setTopK] = useState(10)
  const [poolSize, setPoolSize] = useState(100)

  const quotaQuery = useQuery({
    queryKey: queryKeys.recommendationQuota,
    queryFn: recommendationsApi.quota,
    staleTime: 30 * 1000,
    retry: false,
  })

  const jobsQuery = useQuery({
    queryKey: queryKeys.jobsByCreator(user?.id ?? 0, jobPageParams),
    queryFn: () => jobsApi.byCreator(user!.id, jobPageParams),
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  })

  const jobs = useMemo(() => jobsQuery.data?.content?.data ?? [], [jobsQuery.data?.content?.data])
  const selectedJobId = manualSelectedJobId ?? jobs[0]?.id ?? null
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  )

  const runMutation = useMutation({
    mutationFn: ({ jobId, topK: nextTopK, poolSize: nextPoolSize }: CandidateRunVariables) =>
      recommendationsApi.candidates(jobId, { topK: nextTopK, poolSize: nextPoolSize }),
    onSuccess: (response, variables) => {
      setResultJobId(variables.jobId)
      setLastContent(response.content ?? null)
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendationQuota })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'AI candidate recommendations are unavailable'))
    },
  })

  const content = resultJobId === selectedJobId ? lastContent : undefined
  const quota = content?.quota ?? quotaQuery.data?.content
  const candidates = content?.data ?? []
  const canRun = Boolean(selectedJobId && (quota?.remaining ?? 0) > 0)

  function runMatching() {
    if (!selectedJobId) {
      toast.error('Choose one of your posted jobs before running AI matching')
      return
    }

    runMutation.mutate({ jobId: selectedJobId, topK, poolSize })
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/candidates" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to candidate directory
          </Link>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary">
            <Sparkles className="h-4 w-4" />
            Recruiter AI
          </div>
          <h1 className="font-display text-4xl font-bold">Recommended candidates</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Select one of your posted jobs, review your daily AI usage, then run matching when you are ready.
          </p>
        </div>
        {content ? (
          <Button type="button" variant="secondary" onClick={runMatching} disabled={runMutation.isPending || !canRun}>
            {runMutation.isPending ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            Run again
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid gap-5">
          <JobSelectionPanel
            jobs={jobs}
            loading={jobsQuery.isPending}
            selectedJobId={selectedJobId}
            topK={topK}
            poolSize={poolSize}
            onSelectJob={setManualSelectedJobId}
            onTopKChange={setTopK}
            onPoolSizeChange={setPoolSize}
          />

          {!content ? (
            <StartCandidateMatchingCard
              selectedJob={selectedJob}
              quota={quota}
              loadingQuota={quotaQuery.isPending}
              canRun={canRun}
              isRunning={runMutation.isPending}
              onRun={runMatching}
            />
          ) : candidates.length || runMutation.isPending ? (
            <CandidateResultsPanel
              candidates={candidates}
              elapsedMs={content.elapsedMs}
              model={content.model}
              selectedJob={selectedJob}
              isRefreshing={runMutation.isPending}
              skeletonCount={Math.min(5, topK)}
            />
          ) : (
            <EmptyResultsCard onRun={runMatching} disabled={!canRun || runMutation.isPending} />
          )}
        </section>

        <aside className="grid content-start gap-5 xl:sticky xl:top-24">
          <RecruiterQuotaCard quota={quota} loading={quotaQuery.isPending} />
          <MatchingPolicyCard />
        </aside>
      </div>
    </div>
  )
}

function JobSelectionPanel({
  jobs,
  loading,
  selectedJobId,
  topK,
  poolSize,
  onSelectJob,
  onTopKChange,
  onPoolSizeChange,
}: {
  jobs: Job[]
  loading: boolean
  selectedJobId: number | null
  topK: number
  poolSize: number
  onSelectJob: (jobId: number) => void
  onTopKChange: (value: number) => void
  onPoolSizeChange: (value: number) => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
              <BriefcaseBusiness className="h-4 w-4" />
              Job context
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold">Choose the role to match</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              The backend sends this job plus a limited candidate pool to the AI service. Ownership is still checked by the backend.
            </p>
          </div>
          <Link href="/jobs/new">
            <Button variant="secondary">
              <BriefcaseBusiness className="h-4 w-4" />
              Post job
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : jobs.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {jobs.slice(0, 6).map((job) => (
              <button
                key={job.id}
                type="button"
                className={cn(
                  'rounded-lg border p-4 text-left transition hover:border-primary',
                  selectedJobId === job.id ? 'border-primary bg-primary/5' : 'border-border bg-white'
                )}
                onClick={() => onSelectJob(job.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug">{job.tenCongViec}</h3>
                  {selectedJobId === job.id ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                  <Badge tone="accent">{job.chiTietLoaiCongViec?.tenChiTiet ?? 'Marketplace'}</Badge>
                  <span>{currency(job.giaTien)}</span>
                  <span>{(job.saoCongViec ?? 0).toFixed(1)} rating</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-muted p-5">
            <h3 className="font-display text-xl font-bold">Post a job first</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Candidate recommendations need a job description so the model knows what to match against.
            </p>
            <Link href="/jobs/new" className="mt-4 inline-flex">
              <Button>Post job</Button>
            </Link>
          </div>
        )}

        <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <OptionSelect label="Results" value={topK} options={topKOptions} onChange={onTopKChange} suffix="candidates" />
          <OptionSelect label="Candidate pool" value={poolSize} options={poolSizeOptions} onChange={onPoolSizeChange} suffix="profiles" />
        </div>
      </CardContent>
    </Card>
  )
}

function OptionSelect({
  label,
  value,
  options,
  suffix,
  onChange,
}: {
  label: string
  value: number
  options: number[]
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold uppercase text-muted">{label}</span>
      <select
        className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-semibold"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option} {suffix}
          </option>
        ))}
      </select>
    </label>
  )
}

function StartCandidateMatchingCard({
  selectedJob,
  quota,
  loadingQuota,
  canRun,
  isRunning,
  onRun,
}: {
  selectedJob: Job | null
  quota?: RecommendationQuota
  loadingQuota: boolean
  canRun: boolean
  isRunning: boolean
  onRun: () => void
}) {
  return (
    <Card>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold">Run candidate matching when ready</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Matching starts only after you proceed. If the AI service is unavailable, the page stays here and shows the error as a pop-up.
          </p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <ProcessItem icon={<ShieldCheck className="h-4 w-4" />} label="Owner checked" text="Backend verifies this is your job." />
            <ProcessItem icon={<Zap className="h-4 w-4" />} label="One AI token" text="A successful non-empty run spends one daily use." />
            <ProcessItem icon={<Database className="h-4 w-4" />} label="Private payload" text="Candidates are loaded server-side, not by AI." />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-bold uppercase text-primary">Selected job</p>
          <h3 className="mt-2 line-clamp-3 font-display text-xl font-bold">{selectedJob?.tenCongViec ?? 'No job selected'}</h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            {loadingQuota ? 'Checking daily AI quota...' : `${quota?.remaining ?? 0} of ${quota?.limit ?? 0} AI tokens left today.`}
          </p>
          <Button className="mt-5 w-full" size="lg" type="button" onClick={onRun} disabled={loadingQuota || isRunning || !canRun}>
            {isRunning ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {canRun ? 'Proceed to match' : 'No AI uses left'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CandidateResultsPanel({
  candidates,
  elapsedMs,
  model,
  selectedJob,
  isRefreshing,
  skeletonCount,
}: {
  candidates: RecommendedCandidate[]
  elapsedMs?: number
  model?: string
  selectedJob: Job | null
  isRefreshing: boolean
  skeletonCount: number
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Ranked candidate matches</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{candidates.length} recommended candidates</h2>
            <p className="mt-1 text-sm text-muted">{selectedJob ? `For ${selectedJob.tenCongViec}` : 'For the selected job'}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
            <Badge tone="neutral">{model || 'AI matcher'}</Badge>
            <Badge tone="neutral">{Math.round(elapsedMs ?? 0)} ms</Badge>
          </div>
        </div>
        <div className="grid gap-4">
          {isRefreshing
            ? <CandidateResultSkeletonRows count={skeletonCount} />
            : candidates.map((candidate) => <CandidateMatchCard key={candidate.id} candidate={candidate} />)}
        </div>
      </CardContent>
    </Card>
  )
}

function CandidateMatchCard({ candidate }: { candidate: RecommendedCandidate }) {
  const skills = (candidate.profileSkills ?? candidate.skills ?? [])
    .map((skill) => skill.name?.trim())
    .filter((skill): skill is string => Boolean(skill))
  const recommendation = candidate.recommendation

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <FeedAvatar user={candidate} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/profile/${candidate.id}`} className="block truncate font-display text-xl font-bold hover:text-primary">
                {candidate.name}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                {candidate.headline || candidate.bio || 'Candidate profile'}
              </p>
            </div>
            <MatchBadge label={recommendation.label} score={recommendation.finalScore} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {candidate.location || 'Location not listed'}
            </span>
            <span>Rank #{recommendation.rank}</span>
            <span>Semantic {formatMatchScore(recommendation.aiScore)}</span>
          </div>
          {skills.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.slice(0, 6).map((skill) => (
                <span key={skill} className="rounded bg-accent/30 px-2 py-1 text-xs font-bold text-foreground">{skill}</span>
              ))}
            </div>
          ) : null}
          <ScoreBreakdown recommendation={recommendation} />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:w-44 lg:flex-col">
          <Link href={`/profile/${candidate.id}`}>
            <Button className="w-full" variant="secondary">
              View profile
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
          <ConnectionActions className="lg:grid" userId={candidate.id} userName={candidate.name} />
        </div>
      </div>
    </div>
  )
}

function ScoreBreakdown({ recommendation }: { recommendation: RecommendedCandidate['recommendation'] }) {
  const rows = [
    ['Skills', recommendation.skillScore],
    ['Seniority', recommendation.seniorityScore],
    ['Category', recommendation.categoryScore],
  ] as const

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-surface-muted p-3">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-muted">{label}</span>
            <span>{formatMatchScore(value)}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(value * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CandidateResultSkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border p-4">
          <div className="flex gap-4">
            <div className="h-12 w-12 animate-pulse rounded-full bg-surface-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-48 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="h-14 animate-pulse rounded bg-surface-muted" />
                <div className="h-14 animate-pulse rounded bg-surface-muted" />
                <div className="h-14 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

function EmptyResultsCard({ onRun, disabled }: { onRun: () => void; disabled: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <Users className="h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-bold">No candidate matches yet</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          Try a larger candidate pool, improve the job description, or run matching again after more candidate profiles are added.
        </p>
        <Button className="mt-4" type="button" variant="secondary" onClick={onRun} disabled={disabled}>
          Run again
        </Button>
      </CardContent>
    </Card>
  )
}

function RecruiterQuotaCard({ quota, loading }: { quota?: RecommendationQuota; loading: boolean }) {
  const remaining = quota?.remaining ?? 0
  const limit = quota?.limit ?? 0
  const used = quota?.used ?? 0
  const percent = limit ? Math.round((remaining / limit) * 100) : 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">AI tokens</p>
            <h2 className="mt-1 font-display text-xl font-bold">Daily rate limit</h2>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        {loading ? (
          <div className="mt-4 h-24 animate-pulse rounded bg-surface-muted" />
        ) : (
          <>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="font-display text-4xl font-bold">{remaining}</p>
              <p className="pb-1 text-sm font-semibold text-muted">left of {limit}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Used {used}. One successful non-empty AI result consumes one token. {quota?.resetAt ? `Resets ${formatReset(quota.resetAt)}.` : 'Resets daily.'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MatchingPolicyCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase text-primary">Matching rules</p>
        <h2 className="mt-1 font-display text-xl font-bold">Backend-controlled access</h2>
        <div className="mt-4 grid gap-3 text-sm">
          <PolicyRow icon={<ShieldCheck className="h-4 w-4" />} label="Authorization" text="Only employers and admins can run candidate recommendations." />
          <PolicyRow icon={<BriefcaseBusiness className="h-4 w-4" />} label="Ownership" text="Employers can only match candidates for jobs they posted." />
          <PolicyRow icon={<Clock3 className="h-4 w-4" />} label="Rate limit" text="Daily quota is enforced by the backend and shared with job recommendations." />
          <PolicyRow icon={<SlidersHorizontal className="h-4 w-4" />} label="Reranking" text="AI similarity is combined with skills, seniority, and category signals." />
        </div>
      </CardContent>
    </Card>
  )
}

function PolicyRow({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg bg-surface-muted p-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>
        <span className="block font-bold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{text}</span>
      </span>
    </div>
  )
}

function ProcessItem({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 font-bold text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
    </div>
  )
}

function formatReset(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'daily'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
