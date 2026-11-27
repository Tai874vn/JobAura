'use client'

/**
 * Candidate AI job recommendations page (/recommendations/jobs).
 * Shows the last saved matches on load, lets the user run a fresh match against their daily quota, and shows a skill-gap tooltip on card hover or focus.
 *
 * Calls: GET /api/recommendations/quota; POST /api/recommendations/jobs; useSession; useQuery; useMutation; HiringPostCard; MatchBadge
 * Used by:
 *   - app/(workspace)/recommendations/jobs/page.tsx
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, BrainCircuit, CheckCircle2, Clock3, Lightbulb, ListOrdered, Zap } from 'lucide-react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type FocusEvent as ReactFocusEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/hooks/use-session'
import { recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ApiResponse, RecommendationContent, RecommendedJob } from '@/shared/schemas'
import { Button, ButtonLink, Card, CardContent, EmptyState, PageHeader, Skeleton } from '@/shared/ui'
import { HiringPostCard } from '@/features/hiring/components/browse/hiring-post-card'
import { MatchBadge } from './recommendation-ui'

const recommendationParams = { topK: 12, poolSize: 50 }
type SkillGapRecommendation = RecommendedJob['recommendation']

/**
 * /recommendations/jobs: AI job picks for a candidate. On open it shows the last saved run (cacheOnly, no quota
 * used). "Proceed to match" / "Run again" runs the AI and uses one of today's runs (quota). Each card shows the match score;
 * hovering shows the missing skills in a tooltip that follows the pointer without re-rendering the page.
 */
export function RecommendedJobsPage() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const viewerId = user?.id
  // Keep only which card is hovered/focused in React state; pointer coordinates move the tooltip ref directly
  // so mousemove never triggers 60-120Hz full-page re-renders.
  const [activeRecommendation, setActiveRecommendation] = useState<SkillGapRecommendation | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 12, y: 12 })
  const [applyingId, setApplyingId] = useState<number | null>(null)
  const cachedQueryKey = queryKeys.recommendedJobs({ ...recommendationParams, cacheOnly: true }, viewerId)
  // Data: recommendationsApi.quota → GET /api/recommendations/quota → NestjsBE/src/modules/recommendations/services/recommendations.service.ts getQuotaForUser()
  const quotaQuery = useQuery({
    queryKey: queryKeys.viewerRecommendationQuota(viewerId),
    queryFn: recommendationsApi.quota,
    staleTime: 30 * 1000,
    retry: false,
  })
  // Data: recommendationsApi.jobs → POST /api/recommendations/jobs → NestjsBE/src/modules/recommendations/services/recommendations.service.ts recommendJobsForUser()
  const cachedQuery = useQuery({
    queryKey: cachedQueryKey,
    queryFn: () => recommendationsApi.jobs({ ...recommendationParams, cacheOnly: true }),
    staleTime: 15 * 1000,
    retry: false,
  })
  // Data: recommendationsApi.jobs → POST /api/recommendations/jobs → NestjsBE/src/modules/recommendations/services/recommendations.service.ts recommendJobsForUser()
  const runMutation = useMutation({
    mutationFn: (forceRefresh?: boolean) =>
      recommendationsApi.jobs({ ...recommendationParams, forceRefresh: forceRefresh || undefined }),
    onSuccess: (response) => {
      if (response.content) {
        // Put the new run right into React Query cache so later invalidations (apply, profile/resume save)
        // replace it cleanly instead of being hidden by local component state.
        queryClient.setQueryData<ApiResponse<RecommendationContent<RecommendedJob>>>(cachedQueryKey, {
          ...response,
          content: {
            ...response.content,
            cache: {
              ttlSeconds: response.content.cache?.ttlSeconds ?? 300,
              ...response.content.cache,
              hit: true,
            },
          },
        })
        if (response.content.quota) {
          queryClient.setQueryData(queryKeys.viewerRecommendationQuota(viewerId), {
            content: response.content.quota,
          })
        }
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.viewerRecommendationQuota(viewerId) })
      void queryClient.invalidateQueries({ queryKey: cachedQueryKey })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'AI recommendations are unavailable'))
    },
  })

  const content = cachedQuery.data?.content?.cache?.hit ? cachedQuery.data.content : null
  const quota = quotaQuery.data?.content ?? cachedQuery.data?.content?.quota
  const jobs = useMemo(() => sortByFinalScore(content?.data ?? []), [content?.data])
  const canRun = (quota?.remaining ?? 0) > 0
  // Show a real error + retry when loading quota or saved results fails instead of falling back to "0/0".
  const quotaFailed = quotaQuery.isError && !quota
  const cachedFailed = cachedQuery.isError && !content
  const loadError = quotaFailed ? quotaQuery.error : cachedFailed ? cachedQuery.error : null
  const isRetrying = quotaQuery.isFetching || cachedQuery.isFetching
  const retryLoad = () => {
    if (quotaQuery.isError) void quotaQuery.refetch()
    if (cachedQuery.isError) void cachedQuery.refetch()
  }

  const placeTooltip = useCallback((clientX: number, clientY: number) => {
    const pos = computeTooltipPosition(clientX, clientY, window.innerWidth, window.innerHeight)
    pointerPosRef.current = pos
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
    }
  }, [])

  useLayoutEffect(() => {
    if (!activeRecommendation || !tooltipRef.current) return
    const { x, y } = pointerPosRef.current
    tooltipRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }, [activeRecommendation])

  const handleCardMouseEnter = (event: ReactMouseEvent<HTMLElement>, recommendation: SkillGapRecommendation) => {
    placeTooltip(event.clientX, event.clientY)
    setActiveRecommendation(recommendation)
  }
  const handleCardMouseMove = (event: ReactMouseEvent<HTMLElement>) => {
    placeTooltip(event.clientX, event.clientY)
  }
  const handleCardFocus = (
    event: ReactFocusEvent<HTMLElement>,
    recommendation: SkillGapRecommendation,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    placeTooltip(rect.left, rect.top)
    setActiveRecommendation(recommendation)
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
          {loadError ? (
            <Card>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <p className="text-sm text-danger">
                  {getErrorMessage(loadError, 'Could not load AI job recommendations right now.')}
                </p>
                <Button type="button" variant="secondary" onClick={retryLoad} loading={isRetrying}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {/* Keep the action card mounted while cached matches load so the page never jumps. */}
          <StartRecommendationCard
            hasResults={Boolean(content)}
            isLoadingQuota={quotaQuery.isPending}
            quotaError={quotaFailed}
            isRunning={runMutation.isPending}
            canRun={canRun}
            remaining={quota?.remaining ?? 0}
            limit={quota?.limit ?? 0}
            resetAt={quota?.resetAt}
            onRun={() => runMutation.mutate(Boolean(content))}
            onRetry={retryLoad}
          />
          {!content && cachedQuery.isPending ? (
            <RecommendedJobsSkeleton />
          ) : content ? jobs.length ? (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="group/recommendation relative"
                  onMouseEnter={(event) => handleCardMouseEnter(event, job.recommendation)}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={() => setActiveRecommendation(null)}
                  onFocus={(event) => handleCardFocus(event, job.recommendation)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setActiveRecommendation(null)
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
                      void queryClient.invalidateQueries({ queryKey: ['recommendations', 'jobs'] })
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
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <QuotaCard
            quota={quota}
            loading={quotaQuery.isPending}
            hasError={quotaFailed}
            retrying={quotaQuery.isFetching}
            onRetry={retryLoad}
          />
        </aside>
      </div>
      {activeRecommendation ? (
        <SkillGapTooltip
          tooltipRef={tooltipRef}
          recommendation={activeRecommendation}
        />
      ) : null}
    </div>
  )
}

function RecommendedJobsSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-label="Loading your previous matches" aria-busy="true">
      <span className="sr-only">Loading your previous matches</span>
      {[0, 1, 2].map((item) => (
        <div key={item} aria-hidden="true">
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 gap-4">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-5 w-28 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 sm:w-40 sm:flex-col">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}

function SkillGapTooltip({
  tooltipRef,
  recommendation,
}: {
  tooltipRef: React.RefObject<HTMLDivElement | null>
  recommendation: SkillGapRecommendation
}) {
  const hasMatched = recommendation.matchedSkills.length > 0
  const hasMissing = recommendation.missingSkills.length > 0

  return (
    <div
      ref={tooltipRef}
      className="pointer-events-none fixed left-0 top-0 z-[70] will-change-transform"
    >
      {/* Keep `.motion-popover` on an inner box so its translateY entrance never collides with the outer translate3d position. */}
      <div className="motion-popover max-h-[min(320px,calc(100vh-24px))] w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-border bg-surface/95 p-3 shadow-overlay backdrop-blur-sm">
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
  quotaError,
  isRunning,
  canRun,
  remaining,
  limit,
  resetAt,
  onRun,
  onRetry,
}: {
  hasResults: boolean
  isLoadingQuota: boolean
  quotaError: boolean
  isRunning: boolean
  canRun: boolean
  remaining: number
  limit: number
  resetAt?: string
  onRun: () => void
  onRetry: () => void
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
            <Skeleton className="mt-4 h-10 w-28 bg-surface" />
          ) : quotaError ? (
            <p className="mt-3 text-sm text-danger">Could not load your daily runs.</p>
          ) : (
            <p className="mt-2 font-display text-4xl font-medium tabular-nums">{remaining}<span className="text-lg text-muted">/{limit}</span></p>
          )}
          {!quotaError ? (
            <p className="mt-2 text-xs leading-5 text-muted">
              {resetAt ? `Resets ${formatReset(resetAt)}` : 'Daily AI recommendation allowance.'}
            </p>
          ) : null}
          <Button
            className="mt-5 w-full"
            size="lg"
            type="button"
            onClick={quotaError ? onRetry : onRun}
            loading={isRunning}
            disabled={isLoadingQuota || (!quotaError && !canRun)}
          >
            <ListOrdered className="h-4 w-4" />
            {quotaError
              ? 'Try again'
              : isLoadingQuota
                ? 'Checking AI uses...'
                : canRun
                  ? (hasResults ? 'Run again' : 'Proceed to match')
                  : 'No uses left'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function QuotaCard({
  quota,
  loading,
  hasError,
  retrying,
  onRetry,
}: {
  quota?: { limit: number; used: number; remaining: number; resetAt: string }
  loading: boolean
  hasError: boolean
  retrying: boolean
  onRetry: () => void
}) {
  const percent = quota?.limit ? Math.round((quota.remaining / quota.limit) * 100) : 0

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-primary">AI usage</p>
        <h2 className="mt-1 font-display text-xl font-medium">Daily recommendation runs</h2>
        {loading ? (
          <Skeleton className="mt-4 h-20 w-full" />
        ) : hasError ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-danger">Could not load your daily allowance.</p>
            <Button className="w-full" type="button" variant="secondary" onClick={onRetry} loading={retrying}>
              Try again
            </Button>
          </div>
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

/** Clamps the floating skill-gap tooltip inside the viewport edges. */
export function computeTooltipPosition(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  const tooltipWidth = 332
  const tooltipHeight = 260
  const margin = 12
  const offset = 18
  const maxX = Math.max(margin, viewportWidth - tooltipWidth - margin)
  const maxY = Math.max(margin, viewportHeight - tooltipHeight - margin)

  return {
    x: Math.min(Math.max(clientX + offset, margin), maxX),
    y: Math.min(Math.max(clientY + offset, margin), maxY),
  }
}
