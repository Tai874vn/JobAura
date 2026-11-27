'use client'

/**
 * Error boundary for the service detail page (/jobs/[id]).
 * Shows a recovery screen when loading a service listing fails.
 *
 * Calls: RouteError
 * Used by:
 *   - Next.js router: error for /jobs/[id]
 */

import { RouteError } from '@/shared/ui'

export default function JobDetailError({
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
      title="Could not load this service"
      description="Something went wrong while loading this listing. Try again, or go back home."
    />
  )
}
