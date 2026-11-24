'use client'

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
