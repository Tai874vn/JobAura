'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/features/auth/use-session'
import { pipelineApi } from '@/features/hiring-pipeline/api'
import { StatusBadge } from '@/features/hiring-pipeline/status-badge'
import type { ApplicationDetail } from '@/shared/schemas'
import { ButtonLink } from '@/shared/ui'

type MyApplication = Pick<ApplicationDetail, 'id' | 'hiringPostId' | 'status' | 'statusReason'>

/** The candidate's application to one post, picked from the list of their applications. */
export function applicationForPost<T extends Pick<MyApplication, 'hiringPostId'>>(rows: T[] | undefined, postId: number): T | null {
  return rows?.find((row) => row.hiringPostId === postId) ?? null
}

/**
 * The signed-in candidate's applications. The post cards only say "viewerHasApplied" (yes or no), so the
 * application id and status come from here. One request serves every card on the page. The key starts with
 * "pipeline" (live updates reload it) and carries the user id (nobody sees another person's list).
 */
function useMyApplications(enabled: boolean) {
  const { user } = useSession()
  const userId = user?.id ?? 0
  return useQuery({
    queryKey: ['pipeline', 'post-lookup', userId],
    queryFn: async () => (await pipelineApi.mine({ page: 1, pageSize: 50 })).data,
    enabled: enabled && Boolean(user),
    staleTime: 30_000,
  })
}

/** What a candidate who applied sees instead of the Apply button: their status and a link to the application. */
export function AppliedActionView({ application }: { application: MyApplication | null }) {
  return (
    <div className="grid gap-2">
      {application ? (
        <div><StatusBadge status={application.status} viewer="candidate" reason={application.statusReason} /></div>
      ) : null}
      <ButtonLink href={application ? `/my-applications?application=${application.id}` : '/my-applications'} variant="secondary" className="w-full">
        View my application
      </ButtonLink>
    </div>
  )
}

export function AppliedAction({ postId }: { postId: number }) {
  const applications = useMyApplications(true)
  return <AppliedActionView application={applicationForPost(applications.data, postId)} />
}
