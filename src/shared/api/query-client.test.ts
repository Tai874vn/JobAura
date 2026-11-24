import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { getQueryClient, shouldRetryQuery } from './query-client'

function axiosErrorWithStatus(status?: number) {
  const config = {} as InternalAxiosRequestConfig
  return new AxiosError(
    status ? `HTTP ${status}` : 'Network Error',
    status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK',
    config,
    undefined,
    status
      ? { status, statusText: 'Error', data: {}, headers: {}, config }
      : undefined,
  )
}

describe('getQueryClient', () => {
  it('configures sensible retry, staleTime, and gcTime defaults', () => {
    const client = getQueryClient()
    const defaults = client.getDefaultOptions().queries

    expect(defaults?.retry).toBe(shouldRetryQuery)
    expect(defaults?.staleTime).toBe(60_000)
    expect(defaults?.gcTime).toBe(600_000)
    expect(defaults?.refetchOnWindowFocus).toBe(false)
  })
})

describe('shouldRetryQuery', () => {
  it('does not retry non-retryable 4xx client errors', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetryQuery(0, axiosErrorWithStatus(status))).toBe(false)
    }
  })

  it('retries 408 timeouts and 429 rate-limit responses up to twice', () => {
    for (const status of [408, 429]) {
      expect(shouldRetryQuery(0, axiosErrorWithStatus(status))).toBe(true)
      expect(shouldRetryQuery(1, axiosErrorWithStatus(status))).toBe(true)
      expect(shouldRetryQuery(2, axiosErrorWithStatus(status))).toBe(false)
    }
  })

  it('retries 5xx server errors, network errors, and generic errors up to twice', () => {
    for (const error of [
      axiosErrorWithStatus(500),
      axiosErrorWithStatus(502),
      axiosErrorWithStatus(503),
      axiosErrorWithStatus(undefined),
      new Error('Unexpected failure'),
    ]) {
      expect(shouldRetryQuery(0, error)).toBe(true)
      expect(shouldRetryQuery(1, error)).toBe(true)
      expect(shouldRetryQuery(2, error)).toBe(false)
    }
  })
})
