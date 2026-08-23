import { afterEach, describe, expect, it, vi } from 'vitest'

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(async () => ({ toString: (): string => 'session=private-cookie' })),
}))

vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/shared/config/env', () => ({
  getServerEnv: () => ({ backendApiBaseUrl: 'http://backend:3002' }),
}))

import { serverRequest } from './server'

describe('serverRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    cookiesMock.mockClear()
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
})
