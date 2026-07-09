'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, BrainCircuit, CheckCircle2, Clock3, Lightbulb, RefreshCw, Sparkles, Zap } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { RecommendationContent, RecommendedJob } from '@/shared/schemas'
import { Button, Card, CardContent, CardSkeleton, Spinner } from '@/shared/ui'
import { JobCard } from './job-card'
import { MatchBadge } from './recommendation-ui'

const recommendationParams = { topK: 12, poolSize: 50 }

export function RecommendedJobsPage() {
  const queryClient = useQueryClient()
  const [lastContent, setLastContent] = useState<RecommendationContent<RecommendedJob> | null>(null)
  const quotaQuery = useQuery({
    queryKey: queryKeys.recommendationQuota,
    queryFn: recommendationsApi.quota,
    staleTime: 30 * 1000,
    retry: false,
  })
  const runMutation = useMutation({
    mutationFn: () => recommendationsApi.jobs(recommendationParams),
    onSuccess: (response) => {
      setLastContent(response.content ?? null)
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendationQuota })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'AI recommendations are unavailable'))
    },
  })

  const content = lastContent
  const quota = content?.quota ?? quotaQuery.data?.content
  const jobs = content?.data ?? []
  const canRun = (quota?.remaining ?? 0) > 0

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/jobs" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to explore
          </Link>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary">
            <Sparkles className="h-4 w-4" />
            AI recommendations
          </div>
          <h1 className="font-display text-4xl font-bold">Recommended jobs</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Review your AI usage first. Matching starts only after you proceed.
          </p>
        </div>
        {content ? (
          <Button type="button" variant="secondary" onClick={() => runMutation.mutate()} disabled={runMutation.isPending || !canRun}>
            {runMutation.isPending ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            Run again
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          {!content ? (
            <StartRecommendationCard
              isLoadingQuota={quotaQuery.isPending}
              isRunning={runMutation.isPending}
              canRun={canRun}
              remaining={quota?.remaining ?? 0}
              limit={quota?.limit ?? 0}
              resetAt={quota?.resetAt}
              onRun={() => runMutation.mutate()}
            />
          ) : jobs.length ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
                <span>Model: {content.model || 'AI matcher'}</span>
                <span>{Math.round(content.elapsedMs ?? 0)} ms</span>
                <span>{jobs.length} recommendations</span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {runMutation.isPending
                  ? Array.from({ length: Math.min(6, recommendationParams.topK) }).map((_, index) => <CardSkeleton key={index} />)
                  : jobs.map((job, index) => (
                      <div key={job.id} className="relative">
                        <div className="absolute left-3 top-3 z-10">
                          <MatchBadge label={job.recommendation.label} score={job.recommendation.finalScore} />
                        </div>
                        <JobCard job={job} priority={index < 3} />
                        <SkillGapPanel recommendation={job.recommendation} />
                      </div>
                    ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <Sparkles className="h-8 w-8 text-primary" />
                <h2 className="mt-3 font-display text-2xl font-bold">No recommendations yet</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                  Add resume details and profile skills, then run matching again.
                </p>
                <Link
                  href="/settings"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary-bright"
                >
                  Update profile
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <QuotaCard quota={quota} loading={quotaQuery.isPending} />
        </aside>
      </div>
    </div>
  )
}

function SkillGapPanel({
  recommendation,
}: {
  recommendation: {
    matchedSkills: string[]
    missingSkills: string[]
    improvementTips: string[]
  }
}) {
  const hasMatched = recommendation.matchedSkills.length > 0
  const hasMissing = recommendation.missingSkills.length > 0

  return (
    <div className="-mt-px rounded-b-lg border border-t-0 border-border bg-white p-3">
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
  const chipClass = tone === 'matched' ? 'bg-primary/10 text-primary' : 'bg-[#fff3bf] text-[#6f4600]'

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
  isLoadingQuota,
  isRunning,
  canRun,
  remaining,
  limit,
  resetAt,
  onRun,
}: {
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
          <h2 className="mt-4 font-display text-3xl font-bold">Run job matching when you are ready</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            This uses your resume, profile skills, and the current service marketplace to calculate semantic matches. The AI service is not called until you proceed.
          </p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <ProcessItem icon={<CheckCircle2 className="h-4 w-4" />} label="Profile checked" text="Resume and skills are sent by backend." />
            <ProcessItem icon={<Zap className="h-4 w-4" />} label="One AI use" text="Proceeding spends one daily run." />
            <ProcessItem icon={<Clock3 className="h-4 w-4" />} label="Cached locally" text="Results stay on this page until refresh." />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-bold uppercase text-primary">Available today</p>
          {isLoadingQuota ? (
            <div className="mt-4 h-10 w-28 animate-pulse rounded bg-white" />
          ) : (
            <p className="mt-2 font-display text-4xl font-bold">{remaining}<span className="text-lg text-muted">/{limit}</span></p>
          )}
          <p className="mt-2 text-xs leading-5 text-muted">
            {resetAt ? `Resets ${formatReset(resetAt)}` : 'Daily AI recommendation allowance.'}
          </p>
          <Button className="mt-5 w-full" size="lg" type="button" onClick={onRun} disabled={isLoadingQuota || isRunning || !canRun}>
            {isRunning ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {canRun ? 'Proceed to match' : 'No uses left'}
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
