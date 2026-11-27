'use client'

/**
 * Error boundary for pages in the workspace route group. Shows a recovery screen with retry and home actions when a workspace page fails to load.
 *
 * Calls: RouteError
 * Used by:
 *   - Next.js router: error for /
 */

import { RouteError } from '@/shared/ui'

export default function WorkspaceError({
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
      title="Something went wrong"
      description="We could not load this workspace page. Try again, or go back home."
    />
  )
}
