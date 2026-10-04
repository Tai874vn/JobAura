'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, BrainCircuit, CheckCircle2, Clock3, Lightbulb, Sparkles, Zap } from 'lucide-react'
import { useMemo, useState, type FocusEvent as ReactFocusEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { toast } from 'sonner'
import { recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { RecommendationContent, RecommendedJob } from '@/shared/schemas'
import { Button, ButtonLink, Card, CardContent, EmptyState, PageHeader, Spinner } from '@/shared/ui'
import { JobCard } from './job-card'
import { MatchBadge } from './recommendation-ui'

const recommendationParams = { topK: 12, poolSize: 50 }
type SkillGapRecommendation = RecommendedJob['recommendation']
type SkillGapTooltipState = {
  x: number
  y: number
  recommendation: SkillGapRecommendation
} | null

export function RecommendedJobsPage() {
  const queryClient = useQueryClient()
  const [lastContent, setLastContent] = useState<RecommendationContent<RecommendedJob> | null>(null)
  const [skillGapTooltip, setSkillGapTooltip] = useState<SkillGapTooltipState>(null)
  const quotaQuery = useQuery({
    queryKey: queryKeys.recommendationQuota,
    queryFn: recommendationsApi.quota,
    staleTime: 30 * 1000,
    retry: false,
  })
  const cachedQuery = useQuery({
    queryKey: queryKeys.recommendedJobs({ ...recommendationParams, cacheOnly: true }),
    queryFn: () => recommendationsApi.jobs({ ...recommendationParams, cacheOnly: true }),
    staleTime: 15 * 1000,
    retry: false,
  })
  const runMutation = useMutation({
    mutationFn: (forceRefresh?: boolean) =>
      recommendationsApi.jobs({ ...recommendationParams, forceRefresh: forceRefresh || undefined }),
    onSuccess: (response) => {
      setLastContent(response.content ?? null)
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendationQuota })
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendedJobs({ ...recommendationParams, cacheOnly: true }) })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'AI recommendations are unavailable'))
    },
  })

  const cachedContent = cachedQuery.data?.content?.cache?.hit ? cachedQuery.data.content : null
  const content = lastContent ?? cachedContent
  const quota = lastContent?.quota ?? quotaQuery.data?.content ?? cachedContent?.quota
  const jobs = useMemo(() => sortByFinalScore(content?.data ?? []), [content?.data])
  const canRun = (quota?.remaining ?? 0) > 0
  const showSkillGapTooltip = (event: ReactMouseEvent<HTMLElement>, recommendation: SkillGapRecommendation) => {
    setSkillGapTooltip(positionSkillGapTooltip(event.clientX, event.clientY, recommendation))
  }
  const showSkillGapTooltipFromFocus = (
    event: ReactFocusEvent<HTMLElement>,
    recommendation: SkillGapRecommendation,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setSkillGapTooltip(positionSkillGapTooltip(rect.left + 18, rect.top + 18, recommendation))
  }

  return (
    <div className="container-page pt-10 pb-16">
      <Link href="/jobs" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to explore
      </Link>
      <PageHeader
        eyebrow={<><Sparkles className="h-4 w-4" /> AI recommendations</>}
        title="Recommended jobs"
        description="Review your AI usage first. Matching starts only after you proceed."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-5">
          {!content && cachedQuery.isPending ? (
            <Card>
              <CardContent className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm font-semibold text-muted">
                <Spinner className="h-5 w-5" />
                Loading your previous matches...
              </CardContent>
            </Card>
          ) : (
            <>
              <StartRecommendationCard
                hasResults={Boolean(content)}
                isLoadingQuota={quotaQuery.isPending}
                isRunning={runMutation.isPending}
                canRun={canRun}
                remaining={quota?.remaining ?? 0}
                limit={quota?.limit ?? 0}
                resetAt={quota?.resetAt}
                onRun={() => runMutation.mutate(Boolean(content))}
              />
              {content ? jobs.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {jobs.map((job, index) => (
                    <div
                      key={job.id}
                      className="group/recommendation relative"
                      onMouseMove={(event) => showSkillGapTooltip(event, job.recommendation)}
                      onMouseLeave={() => setSkillGapTooltip(null)}
                      onFocus={(event) => showSkillGapTooltipFromFocus(event, job.recommendation)}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setSkillGapTooltip(null)
                        }
                      }}
                    >
                      <div className="absolute left-3 top-3 z-10">
                        <MatchBadge label={job.recommendation.label} score={job.recommendation.finalScore} />
                      </div>
                      <JobCard job={job} priority={index < 3} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Sparkles />}
                  title="No recommendations yet"
                  description="Add resume details and profile skills, then run matching again."
                  action={
                    <ButtonLink href="/settings" variant="secondary">
                      Update profile
                    </ButtonLink>
                  }
                />
              ) : null}
            </>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <QuotaCard quota={quota} loading={quotaQuery.isPending} />
        </aside>
      </div>
      {skillGapTooltip ? (
        <SkillGapTooltip
          x={skillGapTooltip.x}
          y={skillGapTooltip.y}
          recommendation={skillGapTooltip.recommendation}
        />
      ) : null}
    </div>
  )
}

function SkillGapTooltip({
  x,
  y,
  recommendation,
}: {
  x: number
  y: number
  recommendation: SkillGapRecommendation
}) {
  const hasMatched = recommendation.matchedSkills.length > 0
  const hasMissing = recommendation.missingSkills.length > 0

  return (
    <div
      className="pointer-events-none fixed z-[70] max-h-[min(320px,calc(100vh-24px))] w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-border bg-surface/95 p-3 opacity-100 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
        <Lightbulb className="h-3.5 w-3.5" />
        Profile improvement
      </div>
      <div className="mt-3 grid gap-3">
        <SkillList label="Matched" empty="No explicit skill overlap found." skills={hasMatched ? recommendation.matchedSkills : []} tone="matched" />
        <SkillList label="Missing" empty="No missing required skills detected." skills={hasMissing ? recommendation.missingSkills : []} tone="missing" />
      </div>
      {recommendation.improvementTips.length ? (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-muted">
          {recommendation.improvementTips.slice(0, 2).map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SkillList({ label, empty, skills, tone }: { label: string; empty: string; skills: string[]; tone: 'matched' | 'missing' }) {
  const chipClass = tone === 'matched' ? 'bg-primary/10 text-primary' : 'bg-rating/15 text-[#5c4300]'

  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      {skills.length ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((skill) => (
            <span key={skill} className={`rounded px-2 py-1 text-xs font-semibold ${chipClass}`}>{skill}</span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted">{empty}</p>
      )}
    </div>
  )
}

function StartRecommendationCard({
  hasResults,
  isLoadingQuota,
  isRunning,
  canRun,
  remaining,
  limit,
  resetAt,
  onRun,
}: {
  hasResults: boolean
  isLoadingQuota: boolean
  isRunning: boolean
  canRun: boolean
  remaining: number
  limit: number
  resetAt?: string
  onRun: () => void
}) {
  return (
    <Card>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold">
            {hasResults ? 'Update your job matches when you are ready' : 'Run job matching when you are ready'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {hasResults
              ? 'Your current matches stay visible until you choose to refresh them. A fresh run uses your latest resume, skills, and available services.'
              : 'This uses your resume, profile skills, and the current service marketplace to calculate semantic matches. The AI service is not called until you proceed.'}
          </p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <ProcessItem icon={<CheckCircle2 className="h-4 w-4" />} label="Profile checked" text="Resume and skills are sent by backend." />
            <ProcessItem icon={<Zap className="h-4 w-4" />} label="One AI use" text="Proceeding spends one daily run." />
            <ProcessItem icon={<Clock3 className="h-4 w-4" />} label="Keeps your matches" text="Your latest matches can load again without spending another AI use." />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-bold uppercase text-primary">Available today</p>
          {isLoadingQuota ? (
            <div className="mt-4 h-10 w-28 animate-pulse rounded bg-surface" />
          ) : (
            <p className="mt-2 font-display text-4xl font-bold">{remaining}<span className="text-lg text-muted">/{limit}</span></p>
          )}
          <p className="mt-2 text-xs leading-5 text-muted">
            {resetAt ? `Resets ${formatReset(resetAt)}` : 'Daily AI recommendation allowance.'}
          </p>
          <Button className="mt-5 w-full" size="lg" type="button" onClick={onRun} loading={isRunning} disabled={isLoadingQuota || !canRun}>
            <Sparkles className="h-4 w-4" />
            {canRun ? (hasResults ? 'Run again' : 'Proceed to match') : 'No uses left'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function QuotaCard({ quota, loading }: { quota?: { limit: number; used: number; remaining: number; resetAt: string }; loading: boolean }) {
  const percent = quota?.limit ? Math.round((quota.remaining / quota.limit) * 100) : 0

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase text-primary">AI usage</p>
        <h2 className="mt-1 font-display text-xl font-bold">Daily recommendation runs</h2>
        {loading ? (
          <div className="mt-4 h-20 animate-pulse rounded bg-surface-muted" />
        ) : (
          <>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="font-display text-3xl font-bold">{quota?.remaining ?? 0}</p>
              <p className="text-sm font-semibold text-muted">left of {quota?.limit ?? 0}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Used {quota?.used ?? 0}. {quota?.resetAt ? `Resets ${formatReset(quota.resetAt)}.` : 'Resets daily.'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
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

function sortByFinalScore<T extends { recommendation: { finalScore: number; rank?: number } }>(items: T[]) {
  return [...items].sort((first, second) => {
    const scoreDelta = second.recommendation.finalScore - first.recommendation.finalScore
    if (scoreDelta !== 0) return scoreDelta
    return (first.recommendation.rank ?? Number.MAX_SAFE_INTEGER) - (second.recommendation.rank ?? Number.MAX_SAFE_INTEGER)
  })
}

function positionSkillGapTooltip(clientX: number, clientY: number, recommendation: SkillGapRecommendation): Exclude<SkillGapTooltipState, null> {
  const tooltipWidth = 332
  const tooltipHeight = 260
  const margin = 12
  const offset = 18
  const maxX = Math.max(margin, window.innerWidth - tooltipWidth - margin)
  const maxY = Math.max(margin, window.innerHeight - tooltipHeight - margin)

  return {
    x: Math.min(Math.max(clientX + offset, margin), maxX),
    y: Math.min(Math.max(clientY + offset, margin), maxY),
    recommendation,
  }
}
