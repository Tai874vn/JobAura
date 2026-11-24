'use client'

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
