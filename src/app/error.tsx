'use client'

/**
 * Root error boundary for the app (/).
 * Catches unexpected page errors and shows a full-height recovery screen.
 *
 * Calls: RouteError
 * Used by:
 *   - Next.js router: error for /
 */

import { RouteError } from '@/shared/ui'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError error={error} reset={reset} fullHeight />
}
