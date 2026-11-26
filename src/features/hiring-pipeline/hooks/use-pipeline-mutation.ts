'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/hooks/use-session'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ApplicationDetail } from '@/shared/schemas'
import { pipelineKeys } from '../api'

/** 409 (the application moved on) and 400 (for example a time that is now in the past) both carry a sentence to show. */
export function isStaleActionError(error: unknown): boolean {
  return error instanceof AxiosError && (error.response?.status === 409 || error.response?.status === 400)
}

/**
 * Runs one pipeline action (shortlist, offer, pick a time ...) for one application.
 * - Success: the returned application replaces the cached one, and the lists are marked old so they reload.
 * - 409 or 400: the server's own sentence is shown as a toast, and the application is read again, so a button
 *   that no longer fits (the candidate withdrew a second ago) disappears.
 */
export function usePipelineMutation<Vars = void>(
  applicationId: number,
  action: (vars: Vars) => Promise<ApplicationDetail>,
  options: {
    onSuccess?: (detail: ApplicationDetail) => void
    successMessage?: string
    /** True when a dialog shows the error itself for these inputs, so no toast says it a second time. */
    quietErrors?: (vars: Vars) => boolean
  } = {},
) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const detailKey = pipelineKeys.detail(applicationId, user?.id)
  return useMutation({
    mutationFn: action,
    onSuccess: (detail) => {
      queryClient.setQueryData(detailKey, detail)
      void queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      void queryClient.invalidateQueries({ queryKey: ['hiring-posts'] })
      if (options.successMessage) toast.success(options.successMessage)
      options.onSuccess?.(detail)
    },
    onError: (error, vars) => {
      if (!options.quietErrors?.(vars)) toast.error(getErrorMessage(error, 'Could not save this change. Please try again.'))
      if (isStaleActionError(error)) {
        // The application moved on: read it again, and the post's applicants list too (row badge and tab counts).
        void queryClient.invalidateQueries({ queryKey: detailKey })
        void queryClient.invalidateQueries({ queryKey: ['pipeline', 'post'] })
      }
    },
  })
}
