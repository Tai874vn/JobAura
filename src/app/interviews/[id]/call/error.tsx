'use client'

/**
 * Error boundary for the interview call page (/interviews/[id]/call).
 * Shows a full-height recovery screen when the call view fails.
 *
 * Calls: RouteError
 * Used by:
 *   - Next.js router: error for /interviews/[id]/call
 */

import { RouteError } from '@/shared/ui'

export default function InterviewCallError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Interview call unavailable"
      description="Something went wrong with the call screen. Try again, or go back home."
      fullHeight
    />
  )
}
