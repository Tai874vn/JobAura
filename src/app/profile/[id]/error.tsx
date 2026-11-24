'use client'

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
