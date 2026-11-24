'use client'

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
