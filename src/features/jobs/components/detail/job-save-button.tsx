'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/hooks/use-session'
import { savedItemsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage } from '@/shared/lib/utils'

/**
 * Bookmark button of a service. A visitor is sent to sign in first. The icon changes at once and goes back if
 * the server refuses.
 */
export function JobSaveButton({ jobId, initialSaved = false }: { jobId: number; initialSaved?: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading: isSessionLoading } = useSession()
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null)
  // Data: savedItemsApi.jobs → GET /api/saved/jobs → NestjsBE/src/modules/saved-items/services/saved-items.service.ts getSavedJobs()
  const savedQuery = useQuery({
    queryKey: queryKeys.savedJobsPreview(user?.id),
    queryFn: () => savedItemsApi.jobs(undefined, 20),
    enabled: !isSessionLoading && Boolean(user) && !initialSaved,
    staleTime: 60_000,
  })
  const savedFromQuery = savedQuery.data?.content?.data.some((job) => job.id === jobId) ?? false
  const saved = savedOverride ?? (initialSaved || savedFromQuery)

  // Data: savedItemsApi.saveJob → PUT /api/saved/jobs/:jobId → NestjsBE/src/modules/saved-items/services/saved-items.service.ts saveJob()
  // Data: savedItemsApi.unsaveJob → DELETE /api/saved/jobs/:jobId → NestjsBE/src/modules/saved-items/services/saved-items.service.ts unsaveJob()
  const mutation = useMutation({
    mutationFn: (nextSaved: boolean) => nextSaved ? savedItemsApi.saveJob(jobId) : savedItemsApi.unsaveJob(jobId),
    onMutate: (nextSaved) => {
      const previous = savedOverride
      setSavedOverride(nextSaved)
      return { previous }
    },
    onError: (error, _next, context) => {
      setSavedOverride(context?.previous ?? null)
      toast.error(getErrorMessage(error, 'Could not update saved jobs'))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
  })

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => {
        if (!user) {
          router.push(`/auth/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`)
          return
        }
        mutation.mutate(!saved)
      }}
      className={cn(
        'interaction absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/95 text-foreground focus-visible:ring-2 focus-visible:ring-primary-bright hover:border-primary hover:text-primary disabled:opacity-60',
        saved && 'border-primary text-primary'
      )}
      aria-label={saved ? 'Remove saved job' : 'Save job'}
      aria-pressed={saved}
      aria-busy={mutation.isPending}
      title={saved ? 'Remove saved job' : 'Save job'}
    >
      <Bookmark className={cn('h-4 w-4', saved && 'fill-primary')} />
    </button>
  )
}
