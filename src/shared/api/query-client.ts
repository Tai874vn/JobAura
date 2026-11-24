'use client'

import axios from 'axios'
import { isServer, QueryClient } from '@tanstack/react-query'

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

function makeQueryClient() {
  return new QueryClient({
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
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
