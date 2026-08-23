'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { savedItemsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage } from '@/shared/lib/utils'

export function JobSaveButton({ jobId, initialSaved = false }: { jobId: number; initialSaved?: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading: isSessionLoading } = useSession()
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null)
  const savedQuery = useQuery({
    queryKey: queryKeys.savedJobsPreview,
    queryFn: () => savedItemsApi.jobs(undefined, 20),
    enabled: !isSessionLoading && Boolean(user) && !initialSaved,
    staleTime: 60_000,
  })
  const savedFromQuery = savedQuery.data?.content?.data.some((job) => job.id === jobId) ?? false
  const saved = savedOverride ?? (initialSaved || savedFromQuery)

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
        'absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white/95 text-foreground hover:border-primary hover:text-primary disabled:opacity-60',
        saved && 'border-primary text-primary'
      )}
      aria-label={saved ? 'Remove saved job' : 'Save job'}
      title={saved ? 'Remove saved job' : 'Save job'}
    >
      <Bookmark className={cn('h-4 w-4', saved && 'fill-primary')} />
    </button>
  )
}
