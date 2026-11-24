'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/features/auth/use-session'
import { jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { ButtonLink, EmptyState, ListRowSkeleton } from '@/shared/ui'
import { JobForm } from './job-form'

/** Loads one post and opens the post form on it. Only the owner (or an admin) can edit. */
export function JobEditPage({ jobId }: { jobId: number }) {
  const { user } = useSession()
  const query = useQuery({ queryKey: queryKeys.job(jobId), queryFn: () => jobsApi.detail(jobId) })
  const job = query.data?.content

  if (query.isPending) {
    return <div className="container-page pt-10"><ListRowSkeleton /></div>
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
