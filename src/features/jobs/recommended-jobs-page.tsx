'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, BrainCircuit, CheckCircle2, Clock3, Lightbulb, ListOrdered, Zap } from 'lucide-react'
import { useMemo, useState, type FocusEvent as ReactFocusEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { RecommendationContent, RecommendedJob } from '@/shared/schemas'
import { Button, ButtonLink, Card, CardContent, EmptyState, PageHeader, Spinner } from '@/shared/ui'
import { HiringPostCard } from '@/features/hiring/hiring-post-card'
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
  const { user } = useSession()
  const viewerId = user?.id
  const [lastContent, setLastContent] = useState<RecommendationContent<RecommendedJob> | null>(null)
  const [skillGapTooltip, setSkillGapTooltip] = useState<SkillGapTooltipState>(null)
  const [applyingId, setApplyingId] = useState<number | null>(null)
  const quotaQuery = useQuery({
    queryKey: queryKeys.viewerRecommendationQuota(viewerId),
    queryFn: recommendationsApi.quota,
    staleTime: 30 * 1000,
    retry: false,
  })
  const cachedQuery = useQuery({
    queryKey: queryKeys.recommendedJobs({ ...recommendationParams, cacheOnly: true }, viewerId),
    queryFn: () => recommendationsApi.jobs({ ...recommendationParams, cacheOnly: true }),
    staleTime: 15 * 1000,
    retry: false,
  })
  const runMutation = useMutation({
    mutationFn: (forceRefresh?: boolean) =>
      recommendationsApi.jobs({ ...recommendationParams, forceRefresh: forceRefresh || undefined }),
    onSuccess: (response) => {
      setLastContent(response.content ?? null)
      queryClient.invalidateQueries({ queryKey: queryKeys.viewerRecommendationQuota(viewerId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendedJobs({ ...recommendationParams, cacheOnly: true }, viewerId) })
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
      <Link href="/hiring-posts" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        All hiring posts
      </Link>
      <PageHeader
        title="Hiring posts for you"
        description="Open roles ranked for your resume and skills. Hover a role to see which skills match and which are missing."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-5">
          {!content && cachedQuery.isPending ? (
            <Card>
              <CardContent className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm font-medium text-muted">
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
                <div className="grid gap-4">
                  {jobs.map((job) => (
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
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <MatchBadge label={job.recommendation.label} score={job.recommendation.finalScore} />
                        {job.recommendation.missingSkills.length
                          ? <span>Missing: {job.recommendation.missingSkills.slice(0, 3).join(', ')}</span>
                          : null}
                      </div>
                      <HiringPostCard
                        post={job}
                        viewer="candidate"
                        active={applyingId === job.id}
                        onToggleApply={() => setApplyingId((current) => (current === job.id ? null : job.id))}
                        onApplied={() => {
                          setApplyingId(null)
                          void queryClient.invalidateQueries({ queryKey: ['hiring-posts'] })
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<ListOrdered />}
                  title="No matching roles yet"
                  description="Add your resume and skills so roles can be ranked for you, or browse all hiring posts."
                  action={
                    <ButtonLink href="/settings?section=resume" variant="secondary">
                      Update resume
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
      className="pointer-events-none fixed z-[70] max-h-[min(320px,calc(100vh-24px))] w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-border bg-surface/95 p-3 opacity-100 shadow-overlay backdrop-blur-sm"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
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
  const chipClass = tone === 'matched' ? 'bg-primary/10 text-primary' : 'bg-rating/15 text-rating-ink'

  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      {skills.length ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((skill) => (
            <span key={skill} className={`rounded px-2 py-1 text-xs font-medium ${chipClass}`}>{skill}</span>
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
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted text-muted">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-medium">
            {hasResults ? 'Update your job matches when you are ready' : 'Run job matching when you are ready'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {hasResults
              ? 'Your current matches stay visible until you refresh them. A fresh run uses your latest resume, skills, and the hiring posts open today.'
              : 'Ranks the open hiring posts for your resume and skills. Nothing runs until you start it.'}
          </p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <ProcessItem icon={<CheckCircle2 className="h-4 w-4" />} label="Your resume" text="Your resume, skills, and field are compared with each role." />
            <ProcessItem icon={<Zap className="h-4 w-4" />} label="One AI use" text="Proceeding spends one daily run." />
            <ProcessItem icon={<Clock3 className="h-4 w-4" />} label="Keeps your matches" text="Your latest matches can load again without spending another AI use." />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-medium text-primary">Available today</p>
          {isLoadingQuota ? (
            <div className="mt-4 h-10 w-28 animate-pulse rounded bg-surface" />
          ) : (
            <p className="mt-2 font-display text-4xl font-medium tabular-nums">{remaining}<span className="text-lg text-muted">/{limit}</span></p>
          )}
          <p className="mt-2 text-xs leading-5 text-muted">
            {resetAt ? `Resets ${formatReset(resetAt)}` : 'Daily AI recommendation allowance.'}
          </p>
          <Button className="mt-5 w-full" size="lg" type="button" onClick={onRun} loading={isRunning} disabled={isLoadingQuota || !canRun}>
            <ListOrdered className="h-4 w-4" />
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
        <p className="text-xs font-medium text-primary">AI usage</p>
        <h2 className="mt-1 font-display text-xl font-medium">Daily recommendation runs</h2>
        {loading ? (
          <div className="mt-4 h-20 animate-pulse rounded bg-surface-muted" />
        ) : (
          <>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="font-display text-3xl font-medium tabular-nums">{quota?.remaining ?? 0}</p>
              <p className="text-sm font-medium text-muted">left of {quota?.limit ?? 0}</p>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/10">
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
      <div className="flex items-center gap-2 font-medium text-foreground">
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
