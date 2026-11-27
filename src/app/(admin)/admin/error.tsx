'use client'

/**
 * Error boundary for pages under /admin. Shows a recovery screen with retry and home actions when an admin page fails to load.
 *
 * Calls: RouteError
 * Used by:
 *   - Next.js router: error for /admin
 */

import { RouteError } from '@/shared/ui'

export default function AdminError({
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
      description="We could not load this admin page. Try again, or go back home."
    />
  )
}
