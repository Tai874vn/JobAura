import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
}))

import { RequestError } from '@/shared/lib/errors'
import {
  createQueryClient,
  getQueryClient,
  reportNonFatalError,
  reportServerError,
  shouldReportServerError,
  shouldRetryQuery,
} from './query-client'

function axiosErrorWithStatus(
  status?: number,
  options: { data?: unknown; headers?: Record<string, string> } = {},
) {
  const config = {} as InternalAxiosRequestConfig
  return new AxiosError(
    status ? `HTTP ${status}` : 'Network Error',
    status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK',
    config,
    undefined,
    status
      ? {
          status,
          statusText: 'Error',
          data: options.data ?? {},
          headers: options.headers ?? {},
          config,
        }
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

  it('captures 5xx mutation failures once and deduplicates repeated reports of the same error', async () => {
    const client = createQueryClient()
    const serverError = axiosErrorWithStatus(500)
    const wrappedError = new Error('Resume details were saved, but the file upload failed.', { cause: serverError })

    const mutation = client.getMutationCache().build(client, {
      mutationKey: ['resume', 'upload'],
      mutationFn: async () => {
        throw wrappedError
      },
    })

    await expect(mutation.execute(undefined)).rejects.toBe(wrappedError)

    // Reporting the same error again from outside the cache must not double-send to Sentry.
    reportServerError(wrappedError, 'ui:duplicate-check')
    reportServerError(serverError, 'ui:duplicate-check')

    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect(captureExceptionMock).toHaveBeenCalledWith(serverError, {
      tags: { source: 'react-query:mutation' },
      extra: { key: '["resume","upload"]' },
    })

    captureExceptionMock.mockClear()

    const actionError = new RequestError('Something went wrong. Please try again.', 503, 'req-503')
    reportServerError(actionError, 'server-action:delete')
    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect(captureExceptionMock).toHaveBeenCalledWith(actionError, {
      tags: { source: 'server-action:delete', requestId: 'req-503' },
      extra: undefined,
    })

    captureExceptionMock.mockClear()

    // RequestErrors already reported server-side must not be double-reported by the browser cache.
    const alreadyReported = new RequestError('', 500, 'req-server-500', undefined, { reported: true })
    expect(shouldReportServerError(alreadyReported)).toBe(false)
    reportServerError(alreadyReported, 'react-query:mutation')
    expect(captureExceptionMock).not.toHaveBeenCalled()

    // Axios 5xx errors include their backend requestId tag (body or Title-Case header).
    const axiosWithRef = axiosErrorWithStatus(500, { headers: { 'X-Request-ID': 'hdr-500' } })
    reportServerError(axiosWithRef, 'direct:axios')
    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect(captureExceptionMock).toHaveBeenCalledWith(axiosWithRef, {
      tags: { source: 'direct:axios', requestId: 'hdr-500' },
      extra: undefined,
    })
  })
})

describe('reportNonFatalError', () => {
  it('skips Next.js server-action errors carrying a digest to avoid double-reporting with onRequestError', () => {
    const nextActionError = Object.assign(new Error('Server action failed'), { digest: 'NEXT_12345' })

    reportNonFatalError(nextActionError, 'cache:revalidate-job')

    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it('reports client transport failures once without swallowing them', () => {
    const fetchError = new TypeError('Failed to fetch')

    reportNonFatalError(fetchError, 'cache:revalidate-profile')
    reportNonFatalError(fetchError, 'cache:revalidate-profile')

    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect(captureExceptionMock).toHaveBeenCalledWith(fetchError, {
      tags: { source: 'cache:revalidate-profile' },
      extra: undefined,
    })
  })

  it('delegates unreported 5xx errors with requestId and skips 4xx or already-reported errors', () => {
    const serverError = axiosErrorWithStatus(502, { data: { requestId: 'req-502' } })
    reportNonFatalError(serverError, 'cache:revalidate-taxonomy')
    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect(captureExceptionMock).toHaveBeenCalledWith(serverError, {
      tags: { source: 'cache:revalidate-taxonomy', requestId: 'req-502' },
      extra: undefined,
    })

    captureExceptionMock.mockClear()

    reportNonFatalError(axiosErrorWithStatus(403), 'cache:revalidate-taxonomy')
    reportNonFatalError(new RequestError('', 500, 'req-done', undefined, { reported: true }), 'cache:revalidate-taxonomy')
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})
