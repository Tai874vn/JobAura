'use client'

/**
 * Shared error boundary screen shown when a page crashes.
 * Reports the error to Sentry and gives the user a Try again button and a link back home.
 *
 * Calls: Sentry.captureException; cn
 * Used by:
 *   - shared/ui/index.ts
 */

import * as Sentry from '@sentry/nextjs'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/shared/lib/utils'
import { Button } from './button'
import { ButtonLink } from './button-link'
import { Card, CardContent } from './card'

export type RouteErrorProps = {
  error: Error & { digest?: string }
  /** Next.js recovery callback that tries rendering the failed route segment again. */
  reset: () => void
  title?: string
  description?: string
  homeHref?: string
  homeLabel?: string
  /** Centers inside a full viewport when no outer page shell (header/footer) is rendered. */
  fullHeight?: boolean
}

/**
 * Shared error boundary view (recovery screen shown when a page crashes).
 * Reports the failure to Sentry once and offers a Try again button and a link home.
 */
export function RouteError({
  error,
  reset,
  title = 'Something went wrong',
  description = 'This page hit an unexpected error. Try again, or go back home.',
  homeHref = '/',
  homeLabel = 'Back home',
  fullHeight = false,
}: RouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div
      className={cn(
        'flex items-center justify-center px-4 py-12',
        fullHeight ? 'min-h-screen' : 'min-h-[60vh]',
      )}
    >
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center p-8">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger"
          >
            <AlertCircle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-medium text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <ButtonLink href={homeHref} variant="secondary">
              {homeLabel}
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
