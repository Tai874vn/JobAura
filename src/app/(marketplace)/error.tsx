'use client'

/**
 * Error boundary for pages in the marketplace route group. Shows a recovery screen with retry and home actions when a page fails to load.
 *
 * Calls: RouteError
 * Used by:
 *   - Next.js router: error for /
 */

import { RouteError } from '@/shared/ui'

export default function MarketplaceError({
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
      description="We could not load this page right now. Try again, or go back home."
    />
  )
}
