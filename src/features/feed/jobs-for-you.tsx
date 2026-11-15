'use client'

import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { MatchBadge } from '@/features/jobs/recommendation-ui'
import { hiringPostsApi, recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { HiringPost, RecommendedJob } from '@/shared/schemas'
import { ButtonLink, Card } from '@/shared/ui'

const recommendationParams = { topK: 12, poolSize: 50 }
const freshParams = { page: 1, pageSize: 3 }

/**
 * The first thing a candidate sees on Home: roles to apply to. Their AI matches when they have run matching,
 * otherwise the newest open posts.
 */
export function JobsForYou() {
  const matchesQuery = useQuery({
    queryKey: queryKeys.recommendedJobs({ ...recommendationParams, cacheOnly: true }),
    queryFn: () => recommendationsApi.jobs({ ...recommendationParams, cacheOnly: true }),
    staleTime: 15_000,
    retry: false,
  })
  const freshQuery = useQuery({
    queryKey: queryKeys.hiringPosts(freshParams),
    queryFn: () => hiringPostsApi.open(freshParams),
    staleTime: 120_000,
  })
  const cached = matchesQuery.data?.content?.cache?.hit ? matchesQuery.data.content : null
  const matches = ((cached?.data ?? []) as RecommendedJob[]).slice(0, 3)
  const fresh = freshQuery.data?.content?.data.slice(0, 3) ?? []
  const showingMatches = matches.length > 0
  const posts: Array<HiringPost | RecommendedJob> = showingMatches ? matches : fresh
  const loading = matchesQuery.isPending || (!showingMatches && freshQuery.isPending)

  return (
    <Card className="border-primary/30 p-4 sm:p-5" aria-labelledby="jobs-for-you-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="jobs-for-you-title" className="flex items-center gap-2 font-display text-lg font-bold">
          {showingMatches ? <Sparkles className="h-5 w-5 text-primary" /> : <BriefcaseBusiness className="h-5 w-5 text-primary" />}
          {showingMatches ? 'Your best-matching roles' : 'New hiring posts'}
        </h2>
        <Link href="/hiring-posts" className="text-sm font-bold text-primary hover:underline">See all</Link>
      </div>

      {loading ? (
        <div className="mt-3 grid gap-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-surface-muted" />)}
        </div>
      ) : posts.length ? (
        <ul className="mt-2 divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/hiring-posts/${post.id}`} className="flex items-center gap-3 py-3 hover:[&_.title]:text-primary">
                <div className="min-w-0 flex-1">
                  <p className="title truncate text-sm font-semibold">{post.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="truncate">{post.companyName || post.recruiter?.name || 'Recruiter'}</span>
                    <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" aria-hidden="true" />{post.location || 'Flexible'}</span>
                    {post.careerField ? <span>{post.careerField}</span> : null}
                  </p>
                </div>
                {'recommendation' in post ? <MatchBadge label={post.recommendation.label} score={post.recommendation.finalScore} /> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">No open roles right now. Check back soon.</p>
      )}

      {!showingMatches ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/5 p-3">
          <p className="text-sm">Let AI rank open roles for your resume.</p>
          <ButtonLink href="/recommendations/jobs" size="sm"><Sparkles className="h-4 w-4" />Find my matches</ButtonLink>
        </div>
      ) : null}
    </Card>
  )
}
