'use client'

import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
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
  })
  const jobs = query.data?.content?.data ?? []

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
      {query.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : jobs.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted">No services found. Try another keyword.</CardContent>
        </Card>
      )}
    </div>
  )
}
