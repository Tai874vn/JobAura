'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MatchBadge } from '@/features/jobs/recommendation-ui'
import { connectionsApi, hiringPostsApi, recommendationsApi, skillsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, currency, getErrorMessage } from '@/shared/lib/utils'
import type { ConnectionSuggestion, RecommendedJob } from '@/shared/schemas'
import { ButtonLink, Card } from '@/shared/ui'
import { FeedAvatar } from './feed-avatar'

const recommendationParams = { topK: 12, poolSize: 50 }

const desktopRailMedia = '(min-width: 1280px)'

export function RightFeedRail() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(desktopRailMedia)
    const updateVisibility = () => setVisible(mediaQuery.matches)

    updateVisibility()
    mediaQuery.addEventListener('change', updateVisibility)
    return () => mediaQuery.removeEventListener('change', updateVisibility)
  }, [])

  return visible ? <RightFeedRailContent /> : null
}

function RightFeedRailContent() {
  const skillsQuery = useQuery({ queryKey: ['skills', 'feed'], queryFn: skillsApi.all, staleTime: 300_000 })
  const jobsQuery = useQuery({ queryKey: queryKeys.hiringPosts({ feedRail: true }), queryFn: () => hiringPostsApi.open({ page: 1, pageSize: 3 }), staleTime: 120_000 })
  const cachedMatchesQuery = useQuery({
    queryKey: queryKeys.recommendedJobs({ ...recommendationParams, cacheOnly: true }),
    queryFn: () => recommendationsApi.jobs({ ...recommendationParams, cacheOnly: true }),
    staleTime: 15_000,
    retry: false,
  })
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.connectionSuggestions({ page: 1, pageSize: 2 }),
    queryFn: () => connectionsApi.suggestions({ page: 1, pageSize: 2 }),
    staleTime: 60_000,
  })

  const skills = skillsQuery.data?.content?.slice(0, 6) ?? []
  const hiringPosts = jobsQuery.data?.content?.data.slice(0, 3) ?? []
  const cachedContent = cachedMatchesQuery.data?.content?.cache?.hit ? cachedMatchesQuery.data.content : null
  const jobMatches = (cachedContent?.data ?? []).slice(0, 2) as RecommendedJob[]
  const suggestions = (suggestionsQuery.data?.content?.data ?? []).slice(0, 2)

  return (
    <aside className="sticky top-20 hidden h-fit space-y-4 xl:block">
      <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center gap-2 px-4 pt-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">AI job picks</h2>
        </div>
        <div className="p-4">
          {jobMatches.length ? (
            jobMatches.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center gap-3 border-b border-border py-2.5 first:pt-0 last:border-0 hover:[&_p]:text-primary">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{job.tenCongViec}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">From {currency(job.giaTien)}</p>
                </div>
                <MatchBadge label={job.recommendation.label} score={job.recommendation.finalScore} />
              </Link>
            ))
          ) : (
            <p className="pb-1 text-xs leading-5 text-muted">
              Run AI matching once and your top job matches will appear here, ranked for your profile and resume.
            </p>
          )}
          <ButtonLink href="/recommendations/jobs" className="mt-3 w-full">
            <Sparkles className="h-4 w-4" />
            View your matches
          </ButtonLink>
        </div>
      </Card>

      {hiringPosts.length ? (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Fresh hiring posts</h2>
            <Link href="/hiring-posts" className="text-xs font-bold text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-2 divide-y divide-border">
            {hiringPosts.map((job) => (
              <Link key={job.id} href="/hiring-posts" className="block py-2.5 hover:[&_p]:text-primary">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{job.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted">
                  <span>{job.location || 'Flexible location'}</span>
                  {job.employmentType ? <span aria-hidden="true">·</span> : null}
                  {job.employmentType ? <span>{job.employmentType}</span> : null}
                  <span aria-hidden="true">·</span>
                  <span>{job.applicationCount} applicants</span>
                </p>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {suggestions.length ? <SuggestedPeople suggestions={suggestions} /> : null}

      {skills.length ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Trending skills</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Link key={skill} href={`/hiring-posts?keyword=${encodeURIComponent(skill)}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary">
                {skill}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <nav className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-1 text-[11.5px] text-muted" aria-label="Footer">
        <Link href="/welcome" className="hover:text-primary hover:underline">About</Link>
        <Link href="/welcome#how-it-works" className="hover:text-primary hover:underline">How it works</Link>
        <Link href="/welcome#faq" className="hover:text-primary hover:underline">FAQ</Link>
        <Link href="/jobs" className="hover:text-primary hover:underline">Explore services</Link>
      </nav>
    </aside>
  )
}

function SuggestedPeople({ suggestions }: { suggestions: ConnectionSuggestion[] }) {
  const queryClient = useQueryClient()
  const [sentIds, setSentIds] = useState<Set<number>>(new Set())
  const sendMutation = useMutation({
    mutationFn: (userId: number) => connectionsApi.send(userId),
    onSuccess: (_response, userId) => {
      setSentIds((current) => new Set(current).add(userId))
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success('Connection request sent')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not send request')),
  })

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">People you may know</h2>
      </div>
      <div className="mt-2 divide-y divide-border">
        {suggestions.map((person) => {
          const sent = sentIds.has(person.id)
          return (
            <div key={person.id} className="flex items-center gap-2.5 py-2.5">
              <FeedAvatar user={person} />
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${person.id}`} className="block truncate text-[13px] font-bold hover:text-primary">{person.name}</Link>
                <p className="truncate text-[11.5px] text-muted">{person.headline || 'JobAura member'}</p>
              </div>
              <button
                type="button"
                disabled={sent || sendMutation.isPending}
                onClick={() => sendMutation.mutate(person.id)}
                className={cn(
                  'inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition',
                  sent ? 'bg-primary/10 text-primary' : 'bg-primary text-white hover:bg-primary-bright',
                )}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {sent ? 'Sent' : 'Connect'}
              </button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
