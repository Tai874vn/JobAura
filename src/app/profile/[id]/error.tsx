'use client'

/**
 * Error boundary for the public profile page (/profile/[id]). When loading a profile fails, the user sees a fallback screen with retry and home actions.
 *
 * Calls: RouteError
 * Used by:
 *   - Next.js router: error for /profile/[id]
 */

import { RouteError } from '@/shared/ui'

export default function ProfileError({
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
      title="Could not load this profile"
      description="Something went wrong while loading this profile. Try again, or go back home."
    />
  )
}
