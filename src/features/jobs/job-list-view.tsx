'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { jobsApi, recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { JobCard } from './job-card'
import { MatchBadge } from './recommendation-ui'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Card, CardContent, CardSkeleton } from '@/shared/ui'

export function JobListView() {
  const searchParams = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)
  const keyword = searchParams.get('keyword') ?? undefined
  const { user, hasHydrated } = useAuthStore()
  const recommendationParams = { topK: 4, poolSize: 100 }
  const query = useQuery({
    queryKey: queryKeys.jobs({ page, keyword }),
    queryFn: () => jobsApi.paginated({ page, pageSize: 12, keyword }),
    placeholderData: keepPreviousData,
  })
  const recommendationsQuery = useQuery({
    queryKey: queryKeys.recommendedJobs(recommendationParams),
    queryFn: () => recommendationsApi.jobs(recommendationParams),
    enabled: hasHydrated && Boolean(user) && !keyword,
    staleTime: 1000 * 60 * 5,
  })
  const jobs = query.data?.content?.data ?? []
  const recommendedJobs = recommendationsQuery.data?.content?.data ?? []
  const showRecommendations = hasHydrated && Boolean(user) && !keyword && (recommendationsQuery.isPending || recommendedJobs.length > 0)

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Explore services</h1>
          <p className="mt-1 text-sm text-muted">{keyword ? `Results for "${keyword}"` : 'Search and compare marketplace services.'}</p>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>
      {showRecommendations ? (
        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
                <Sparkles className="h-4 w-4" />
                AI matches
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">Recommended for you</h2>
            </div>
            {recommendationsQuery.data?.content?.elapsedMs ? (
              <span className="text-xs font-semibold text-muted">{Math.round(recommendationsQuery.data.content.elapsedMs)}ms</span>
            ) : null}
          </div>
          {recommendationsQuery.isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedJobs.map((job, index) => (
                <div key={job.id}>
                  <div className="mb-2 flex justify-end">
                    <MatchBadge label={job.recommendation.label} score={job.recommendation.finalScore} />
                  </div>
                  <JobCard job={job} priority={index < 4} />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
      {query.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : jobs.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {jobs.map((job, index) => <JobCard key={job.id} job={job} priority={index < 4} />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted">No services found. Try another keyword.</CardContent>
        </Card>
      )}
    </div>
  )
}
