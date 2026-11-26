import { beforeEach, describe, expect, it, vi } from 'vitest'

const { revalidatePath, serverRequest, captureException } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  serverRequest: vi.fn(),
  captureException: vi.fn(),
}))
vi.mock('@sentry/nextjs', () => ({ captureException }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/shared/api/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/server')>()
  return { ...actual, serverRequest }
})

import { refreshMarketplaceTaxonomyPages } from '@/features/admin/utils/refresh-taxonomy-pages'
import { refreshMyProfilePage } from './refresh-profile-page'

const me = (content: unknown) => serverRequest.mockResolvedValue({ ok: true, status: 200, data: { content } })
const noSession = () => serverRequest.mockResolvedValue({ ok: false, status: 401, statusText: '', error: '' })

beforeEach(() => {
  revalidatePath.mockReset()
  serverRequest.mockReset()
  captureException.mockReset()
})

describe('refreshMyProfilePage', () => {
  it("clears only the caller's own profile, with the id from /api/auth/me", async () => {
    me({ id: 11, role: 'user' })

    await refreshMyProfilePage()

    expect(serverRequest).toHaveBeenCalledWith('/api/auth/me')
    expect(revalidatePath.mock.calls).toEqual([['/profile/11']])
  })

  it('does nothing without a session or with a bad id and skips 4xx Sentry reporting', async () => {
    noSession()
    await refreshMyProfilePage()
    me({ id: 0 })
    await refreshMyProfilePage()

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports backend 5xx failures to Sentry with source and requestId', async () => {
    serverRequest.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      error: 'Upstream down',
      requestId: 'req-prof-502',
    })

    await refreshMyProfilePage()

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).toHaveBeenCalledOnce()
    expect(captureException.mock.calls[0]?.[1]).toEqual({
      tags: { source: 'cache:revalidate-profile', requestId: 'req-prof-502' },
      extra: { path: '/api/auth/me', status: 502, requestId: 'req-prof-502' },
    })
  })
})

describe('refreshMarketplaceTaxonomyPages', () => {
  it('clears /welcome and /jobs for an admin', async () => {
    me({ id: 1, role: 'admin' })

    await refreshMarketplaceTaxonomyPages()

    expect(revalidatePath.mock.calls).toEqual([['/welcome'], ['/jobs']])
  })

  it('does nothing for anyone else or without a session', async () => {
    me({ id: 11, role: 'user' })
    await refreshMarketplaceTaxonomyPages()
    noSession()
    await refreshMarketplaceTaxonomyPages()

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports backend 5xx failures to Sentry with source and requestId', async () => {
    serverRequest.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      error: 'DB error',
      requestId: 'req-tax-500',
    })

    await refreshMarketplaceTaxonomyPages()

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).toHaveBeenCalledOnce()
    expect(captureException.mock.calls[0]?.[1]).toEqual({
      tags: { source: 'cache:revalidate-taxonomy', requestId: 'req-tax-500' },
      extra: { path: '/api/auth/me', status: 500, requestId: 'req-tax-500' },
    })
  })
})
