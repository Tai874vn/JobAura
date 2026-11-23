'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ApplicationDetail } from '@/shared/schemas'
import { pipelineKeys } from './api'

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
  options: { onSuccess?: (detail: ApplicationDetail) => void; successMessage?: string } = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: (detail) => {
      queryClient.setQueryData(pipelineKeys.detail(applicationId), detail)
      void queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      void queryClient.invalidateQueries({ queryKey: ['hiring-posts'] })
      if (options.successMessage) toast.success(options.successMessage)
      options.onSuccess?.(detail)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not save this change. Please try again.'))
      if (isStaleActionError(error)) void queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(applicationId) })
    },
  })
}
