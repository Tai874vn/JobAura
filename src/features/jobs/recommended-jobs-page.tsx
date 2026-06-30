'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react'
import { recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { Button, Card, CardContent, CardSkeleton, Spinner } from '@/shared/ui'
import { JobCard } from './job-card'
import { MatchBadge } from './recommendation-ui'

const recommendationParams = { topK: 12, poolSize: 50 }

export function RecommendedJobsPage() {
  const query = useQuery({
    queryKey: queryKeys.recommendedJobs(recommendationParams),
    queryFn: () => recommendationsApi.jobs(recommendationParams),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })

  const content = query.data?.content
  const jobs = content?.data ?? []

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
            Matches are calculated from your resume, profile skills, and current marketplace services.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          Refresh matches
        </Button>
      </div>

      {content ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
          <span>Model: {content.model || 'AI matcher'}</span>
          <span>{Math.round(content.elapsedMs ?? 0)} ms</span>
        </div>
      ) : null}

      <div className="mt-6">
        {query.isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <CardSkeleton key={index} />)}
          </div>
        ) : query.isError ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <AlertCircle className="h-8 w-8 text-primary" />
              <h2 className="mt-3 font-display text-2xl font-bold">AI recommendations are unavailable</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Check that the backend and AI service are running, then try refreshing this page.
              </p>
              <Button className="mt-4" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : jobs.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {jobs.map((job, index) => (
              <div key={job.id} className="relative">
                <div className="absolute left-3 top-3 z-10">
                  <MatchBadge label={job.recommendation.label} score={job.recommendation.finalScore} />
                </div>
                <JobCard job={job} priority={index < 4} />
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="mt-3 font-display text-2xl font-bold">No recommendations yet</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Add resume details and profile skills, then refresh your matches.
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
      </div>
    </div>
  )
}
