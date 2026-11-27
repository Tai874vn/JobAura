'use client'

/**
 * Wrapper page for editing an existing service or portfolio post (/jobs/[id]/edit).
 * Fetches the post, checks that the signed-in user owns it or is an admin, and renders the editor form or an error state.
 *
 * Calls: GET /api/jobs/details/:jobId; useSession; useQuery; JobForm
 * Used by:
 *   - app/(workspace)/jobs/[id]/edit/page.tsx
 */

import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/features/auth/hooks/use-session'
import { jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, Card, EmptyState, Skeleton } from '@/shared/ui'
import { JobForm } from './job-form'

/** Matches JobForm's 2-column layout (sections card on the left, sticky live preview card on the right). */
function JobFormSkeleton() {
  return (
    <div className="container-page pt-10 pb-16" aria-busy="true" role="status" aria-label="Loading post editor">
      <span className="sr-only">Loading post editor</span>
      <Skeleton className="h-9 w-52" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-hidden="true">
        <Card className="divide-y divide-border">
          <div className="space-y-4 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-4 p-5">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="space-y-4 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
          <div className="flex justify-end gap-2.5 p-5">
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </Card>

        <aside className="grid content-start gap-2.5 lg:sticky lg:top-24">
          <Skeleton className="h-4 w-48" />
          <Card className="overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-3.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-[30px] w-[30px] rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

/** Loads one post and opens the post form on it. Only the owner (or an admin) can edit. */
export function JobEditPage({ jobId }: { jobId: number }) {
  const { user } = useSession()
  // Data: jobsApi.detail → GET /api/jobs/details/:jobId → NestjsBE/src/modules/jobs/services/jobs.service.ts getJobDetails()
  const query = useQuery({ queryKey: queryKeys.job(jobId), queryFn: () => jobsApi.detail(jobId) })
  const job = query.data?.content

  if (query.isPending) {
    return <JobFormSkeleton />
  }
  if (query.isError && !job) {
    const status = axios.isAxiosError(query.error) ? query.error.response?.status : undefined
    // Treat transient network or server failures separately from missing/forbidden posts so users can retry.
    if (status !== 403 && status !== 404) {
      return (
        <div className="container-page pt-10">
          <EmptyState
            title="Could not load this post"
            description={getErrorMessage(query.error, 'Something went wrong while loading this post. Please try again.')}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" loading={query.isFetching} onClick={() => query.refetch()}>
                  Try again
                </Button>
                <ButtonLink href="/my-posts" variant="secondary">Back to my posts</ButtonLink>
              </div>
            }
          />
        </div>
      )
    }
  }
  if (!job || (user?.role !== 'admin' && user?.id !== job.creatorId)) {
    return (
      <div className="container-page pt-10">
        <EmptyState
          title="You cannot edit this post"
          description="It may have been removed, or it belongs to someone else."
          action={<ButtonLink href="/my-posts">Back to my posts</ButtonLink>}
        />
      </div>
    )
  }
  // Keyed by the saved time, so the form starts again from the server's copy after a save.
  return <JobForm key={`${job.id}-${job.updatedAt ?? ''}`} job={job} />
}
