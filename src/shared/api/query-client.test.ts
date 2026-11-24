import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
}))

import {
  createQueryClient,
  getQueryClient,
  shouldReportServerError,
  shouldRetryQuery,
} from './query-client'

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

beforeEach(() => {
  captureExceptionMock.mockClear()
})

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

describe('shouldReportServerError', () => {
  it('reports only 5xx Axios errors to Sentry', () => {
    expect(shouldReportServerError(axiosErrorWithStatus(500))).toBe(true)
    expect(shouldReportServerError(axiosErrorWithStatus(502))).toBe(true)
    expect(shouldReportServerError(axiosErrorWithStatus(503))).toBe(true)

    for (const status of [400, 401, 403, 404, 408, 429]) {
      expect(shouldReportServerError(axiosErrorWithStatus(status))).toBe(false)
    }
    expect(shouldReportServerError(axiosErrorWithStatus(undefined))).toBe(false)
    expect(shouldReportServerError(new Error('Client error'))).toBe(false)
  })

  it('captures unexpected 5xx query failures in QueryCache and skips 4xx errors', async () => {
    const client = createQueryClient()
    const serverError = axiosErrorWithStatus(502)

    await expect(
      client.fetchQuery({
        queryKey: ['wallet', 'summary'],
        queryFn: async () => {
          throw serverError
        },
        retry: false,
      }),
    ).rejects.toBe(serverError)

    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect(captureExceptionMock).toHaveBeenCalledWith(serverError, {
      tags: { source: 'react-query:query' },
      extra: { key: '["wallet","summary"]' },
    })

    captureExceptionMock.mockClear()

    const notFoundError = axiosErrorWithStatus(404)
    await expect(
      client.fetchQuery({
        queryKey: ['jobs', 'detail', 999],
        queryFn: async () => {
          throw notFoundError
        },
        retry: false,
      }),
    ).rejects.toBe(notFoundError)

    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})
