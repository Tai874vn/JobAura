'use client'

import * as Sentry from '@sentry/nextjs'
import axios from 'axios'
import { isServer, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

let browserQueryClient: QueryClient | undefined

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

/**
 * Reports only unexpected server errors (HTTP 500+) to Sentry so normal
 * 4xx validation/auth responses or offline drops do not create alert noise.
 */
export function shouldReportServerError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return typeof status === 'number' && status >= 500
}

function captureServerError(error: unknown, source: 'query' | 'mutation', key?: readonly unknown[]) {
  if (!shouldReportServerError(error)) return
  Sentry.captureException(error, {
    tags: { source: `react-query:${source}` },
    extra: key ? { key: JSON.stringify(key) } : undefined,
  })
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
