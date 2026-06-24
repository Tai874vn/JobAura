'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { SlidersHorizontal, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { JobCard } from './job-card'
import { Card, CardContent, CardSkeleton } from '@/shared/ui'

export function JobListView() {
  const searchParams = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)
  const keyword = searchParams.get('keyword') ?? undefined
  const query = useQuery({
    queryKey: queryKeys.jobs({ page, keyword }),
    queryFn: () => jobsApi.paginated({ page, pageSize: 12, keyword }),
    placeholderData: keepPreviousData,
  })
  const jobs = query.data?.content?.data ?? []

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Explore services</h1>
          <p className="mt-1 text-sm text-muted">{keyword ? `Results for "${keyword}"` : 'Search and compare marketplace services.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/recommendations/jobs"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-bright focus-visible:ring-2 focus-visible:ring-primary-bright"
          >
            <Sparkles className="h-4 w-4" />
            AI recommendations
          </Link>
          <button className="flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>
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
