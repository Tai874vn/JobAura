import { afterEach, describe, expect, it, vi } from 'vitest'

const { cookiesMock, captureExceptionMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(async () => ({ toString: (): string => 'session=private-cookie' })),
  captureExceptionMock: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({ captureException: captureExceptionMock }))
vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/shared/config/env', () => ({
  getServerEnv: () => ({ backendApiBaseUrl: 'http://backend:3002' }),
}))

import { RequestError } from '@/shared/lib/errors'
import { reportServerRequestFailure, serverRequest, type ServerRequestFailure } from './server'

describe('serverRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    cookiesMock.mockClear()
    captureExceptionMock.mockClear()
  })

  it('forwards server cookies and serializes object bodies', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ content: { id: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await serverRequest<{ content: { id: number } }>('/api/jobs', {
      method: 'POST',
      body: { title: 'Developer' },
    })

    expect(result).toEqual({ ok: true, status: 200, data: { content: { id: 1 } } })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    const headers = new Headers(init?.headers)
    expect(url).toBe('http://backend:3002/api/jobs')
    expect(headers.get('cookie')).toBe('session=private-cookie')
    expect(headers.get('content-type')).toBe('application/json')
    expect(init?.body).toBe(JSON.stringify({ title: 'Developer' }))
    expect(init?.cache).toBe('no-store')
  })

  it('omits cookies for public cacheable requests', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('public response'))
    vi.stubGlobal('fetch', fetchMock)

    await serverRequest('/api/jobs', {
      includeCookies: false,
      next: { revalidate: 300 },
    })

    const [, init] = fetchMock.mock.calls[0]!
    expect(new Headers(init?.headers).has('cookie')).toBe(false)
    expect(init?.cache).toBeUndefined()
    expect(cookiesMock).not.toHaveBeenCalled()
  })

  it('normalizes backend and network failures', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => Response.json(
      { message: ['Name is required'] },
      { status: 400, statusText: 'Bad Request' },
    )))

    await expect(serverRequest('/api/jobs')).resolves.toEqual({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      error: ['Name is required'],
    })

    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => { throw new Error('connection refused') }))
    await expect(serverRequest('/api/jobs')).resolves.toEqual({
      ok: false,
      status: 0,
      statusText: 'Network error',
      error: 'connection refused',
    })
  })

  it('refuses to cache cookie-authenticated requests', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)

    await expect(serverRequest('/api/private', { next: { revalidate: 60 } })).rejects.toThrow(
      'refusing to cache a request that forwards cookies',
    )
    await expect(serverRequest('/api/private', { next: { tags: ['private'] } })).rejects.toThrow(
      'refusing to cache a request that forwards cookies',
    )
    await expect(serverRequest('/api/private', { cache: 'force-cache' })).rejects.toThrow(
      'refusing to cache a request that forwards cookies',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows includeCookies: true when revalidate is 0', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(serverRequest('/api/private', { next: { revalidate: 0 } })).resolves.toMatchObject({ ok: true })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('extracts backend code and requestId from error bodies and X-Request-ID headers', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => Response.json(
      {
        statusCode: 401,
        message: 'Authentication session is invalid or revoked',
        code: 'SESSION_REVOKED',
        requestId: 'req-auth-401',
      },
      { status: 401, statusText: 'Unauthorized' },
    )))

    await expect(serverRequest('/api/jobs/5', { method: 'DELETE' })).resolves.toEqual({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      error: 'Authentication session is invalid or revoked',
      requestId: 'req-auth-401',
      code: 'SESSION_REVOKED',
    })

    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response('Bad Gateway', {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'X-Request-ID': 'hdr-502' },
    })))

    await expect(serverRequest('/api/auth/me')).resolves.toEqual({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      error: 'Bad Gateway',
      requestId: 'hdr-502',
    })
  })
})

describe('reportServerRequestFailure', () => {
  afterEach(() => {
    captureExceptionMock.mockClear()
  })

  it('reports 5xx failures once with source and requestId tags and skips 4xx', () => {
    const serverFailure: ServerRequestFailure = {
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      error: 'Database pool exhausted',
      requestId: 'req-srv-503',
      code: 'AUTH_UNAVAILABLE',
    }

    expect(reportServerRequestFailure(serverFailure, 'cache:revalidate-profile', '/api/auth/me')).toBe(true)
    expect(reportServerRequestFailure(serverFailure, 'cache:revalidate-profile', '/api/auth/me')).toBe(false)

    expect(captureExceptionMock).toHaveBeenCalledOnce()
    const [capturedError, context] = captureExceptionMock.mock.calls[0]!
    expect(capturedError).toBeInstanceOf(RequestError)
    expect((capturedError as RequestError).message).toBe('Database pool exhausted')
    expect((capturedError as RequestError).status).toBe(503)
    expect((capturedError as RequestError).requestId).toBe('req-srv-503')
    expect((capturedError as RequestError).reported).toBe(true)
    expect(context).toEqual({
      tags: { source: 'cache:revalidate-profile', requestId: 'req-srv-503' },
      extra: {
        path: '/api/auth/me',
        status: 503,
        requestId: 'req-srv-503',
        code: 'AUTH_UNAVAILABLE',
      },
    })

    captureExceptionMock.mockClear()

    expect(
      reportServerRequestFailure(
        { ok: false, status: 401, statusText: 'Unauthorized', error: 'Unauthorized' },
        'cache:revalidate-profile',
        '/api/auth/me',
      ),
    ).toBe(false)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it('reports status 0 server-to-backend connectivity outages once with context', () => {
    const refusedFailure: ServerRequestFailure = {
      ok: false,
      status: 0,
      statusText: 'Network error',
      error: 'connect ECONNREFUSED 127.0.0.1:3002',
    }

    expect(reportServerRequestFailure(refusedFailure, 'cache:revalidate-profile', '/api/auth/me')).toBe(true)
    expect(reportServerRequestFailure(refusedFailure, 'cache:revalidate-profile', '/api/auth/me')).toBe(false)

    expect(captureExceptionMock).toHaveBeenCalledOnce()
    const [capturedError, context] = captureExceptionMock.mock.calls[0]!
    expect(capturedError).toBeInstanceOf(RequestError)
    expect((capturedError as RequestError).message).toBe('connect ECONNREFUSED 127.0.0.1:3002')
    expect((capturedError as RequestError).status).toBe(0)
    expect((capturedError as RequestError).reported).toBe(true)
    expect(context).toEqual({
      tags: { source: 'cache:revalidate-profile' },
      extra: {
        path: '/api/auth/me',
        status: 0,
      },
    })

    captureExceptionMock.mockClear()

    const timeoutFailure: ServerRequestFailure = {
      ok: false,
      status: 0,
      statusText: 'Network error',
      error: 'The operation was aborted due to timeout',
    }

    expect(reportServerRequestFailure(timeoutFailure, 'server-action:delete-job', '/api/jobs/5')).toBe(true)
    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect((captureExceptionMock.mock.calls[0]?.[0] as RequestError).message).toBe(
      'The operation was aborted due to timeout',
    )
    expect(captureExceptionMock.mock.calls[0]?.[1]).toEqual({
      tags: { source: 'server-action:delete-job' },
      extra: {
        path: '/api/jobs/5',
        status: 0,
      },
    })
  })
})
