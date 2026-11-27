'use client'

/**
 * Creates and caches the shared TanStack Query client with retry rules and deduplicated Sentry reporting for 5xx server errors and non-fatal background errors.
 *
 * Calls: RequestError; toUserError
 * Used by:
 *   - 18 files, for example features/admin/components/admin-resource-page.tsx, features/auth/components/logout-page.tsx, features/chat/hooks/use-chat-room-selection.ts
 */

import * as Sentry from '@sentry/nextjs'
import axios from 'axios'
import { isServer, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { RequestError, toUserError } from '@/shared/lib/errors'

let browserQueryClient: QueryClient | undefined
const reportedErrors = new WeakSet<object>()

/**
 * Retry predicate (rule deciding whether to try a failed request again).
 * Skips client errors (4xx like 401/403/404) except 408 (timeout) and 429 (rate limit),
 * and retries transient network or server errors up to 2 times.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return false
    }
  }
  return failureCount < 2
}

function unwrapServerError(error: unknown, seen = new Set<unknown>()): object | null {
  if (!error || typeof error !== 'object' || seen.has(error)) return null
  seen.add(error)
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    return typeof status === 'number' && status >= 500 ? error : null
  }
  if (error instanceof RequestError) {
    return error.status >= 500 && !error.reported ? error : null
  }
  if (error instanceof Error && error.cause) {
    return unwrapServerError(error.cause, seen)
  }
  return null
}

function hasNextDigest(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const digest = (error as { digest?: unknown }).digest
  return typeof digest === 'string' && digest.trim().length > 0
}

function isSkippedNonFatalHttpError(error: unknown, seen = new Set<unknown>()): boolean {
  if (!error || typeof error !== 'object' || seen.has(error)) return false
  seen.add(error)
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    return typeof status === 'number' && status >= 400 && status < 500
  }
  if (error instanceof RequestError) {
    return error.reported || (error.status >= 400 && error.status < 500)
  }
  if (error instanceof Error && error.cause) {
    return isSkippedNonFatalHttpError(error.cause, seen)
  }
  return false
}

/**
 * Reports only unexpected server errors (HTTP 500+) to Sentry so normal
 * 4xx validation/auth responses or offline drops do not create alert noise.
 */
export function shouldReportServerError(error: unknown): boolean {
  return unwrapServerError(error) !== null
}

/**
 * Shared 5xx reporting entry point. Tracks reported errors so the same failure
 * is never sent to Sentry twice across cache callbacks or helper calls.
 */
export function reportServerError(
  error: unknown,
  source: string,
  extra?: Record<string, unknown>,
) {
  const target = unwrapServerError(error)
  if (!target || reportedErrors.has(target)) return
  reportedErrors.add(target)
  const { requestId } = toUserError(target)
  Sentry.captureException(target, {
    tags: requestId ? { source, requestId } : { source },
    extra,
  })
}

/**
 * Reports failures from non-fatal background work (such as cache revalidation
 * Server Actions) so errors are never silently dropped.
 *
 * Errors carrying a Next.js `digest` are skipped here because `instrumentation.ts`
 * already captured the real server crash via `onRequestError`.
 */
export function reportNonFatalError(
  error: unknown,
  source: string,
  extra?: Record<string, unknown>,
) {
  if (hasNextDigest(error)) return
  const serverTarget = unwrapServerError(error)
  if (serverTarget) {
    reportServerError(serverTarget, source, extra)
    return
  }
  if (isSkippedNonFatalHttpError(error)) return

  if (error && typeof error === 'object') {
    if (reportedErrors.has(error)) return
    reportedErrors.add(error)
    Sentry.captureException(error, {
      tags: { source },
      extra,
    })
    return
  }

  Sentry.captureException(new Error(String(error)), {
    tags: { source },
    extra,
  })
}

function captureServerError(error: unknown, source: 'query' | 'mutation', key?: readonly unknown[]) {
  reportServerError(
    error,
    `react-query:${source}`,
    key ? { key: JSON.stringify(key) } : undefined,
  )
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        captureServerError(error, 'query', query.queryKey)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        captureServerError(error, 'mutation', mutation.options.mutationKey)
      },
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function getQueryClient() {
  if (isServer) return createQueryClient()
  browserQueryClient ??= createQueryClient()
  return browserQueryClient
}
