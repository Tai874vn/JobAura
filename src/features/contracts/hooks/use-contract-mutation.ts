'use client'

/**
 * Shared mutation hook for contract and proposal actions in the contracts feature.
 * Saves the fresh detail response to the cache, refreshes contract lists and wallet data, and reloads stale data on conflict errors.
 *
 * Calls: isStaleActionError; getErrorMessage
 * Used by:
 *   - features/contracts/components/proposal/proposal-panel.tsx
 *   - features/contracts/hooks/use-contract-actions.ts
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isStaleActionError } from '@/features/hiring-pipeline/hooks/use-pipeline-mutation'
import { getErrorMessage } from '@/shared/lib/utils'

/**
 * Runs one contract or proposal action (fund, submit, accept, counter ...).
 * `detailKey` is the cache key of the page that is open (for example `contractKeys.contract(id)`).
 * - Success: the fresh detail the server sent replaces the cached one; the lists and the wallet are marked old so they reload.
 * - 409 (the other side or the sweeper acted a second earlier) or 400: the server's own sentence is shown as a toast and the
 *   page is read again, so a button that no longer fits disappears.
 */
export function useContractMutation<Vars = void, Detail = unknown>(
  detailKey: QueryKey,
  action: (vars: Vars) => Promise<Detail>,
  options: {
    onSuccess?: (detail: Detail, vars: Vars) => void
    onError?: (error: unknown, vars: Vars) => void
    successMessage?: string
    /** True when the screen shows the error itself for these inputs (a dialog, or the "Top up" buttons), so no toast repeats it. */
    quietErrors?: (vars: Vars) => boolean
  } = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: (detail, vars) => {
      queryClient.setQueryData(detailKey, detail)
      // Everything under 'contracts' except the detail we just wrote (it is fresh, so no second request).
      void queryClient.invalidateQueries({
        queryKey: ['contracts'],
        predicate: (query) => JSON.stringify(query.queryKey) !== JSON.stringify(detailKey),
      })
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
      if (options.successMessage) toast.success(options.successMessage)
      options.onSuccess?.(detail, vars)
    },
    onError: (error, vars) => {
      if (!options.quietErrors?.(vars)) toast.error(getErrorMessage(error, 'Could not save this change. Please try again.'))
      if (isStaleActionError(error)) {
        void queryClient.invalidateQueries({ queryKey: detailKey })
        // The wallet may differ too (a fund that failed for too few credits).
        void queryClient.invalidateQueries({ queryKey: ['wallet'] })
      }
      options.onError?.(error, vars)
    },
  })
}
