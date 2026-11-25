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

import { refreshServicePageAfterReview } from './refresh-service-page'

beforeEach(() => {
  revalidatePath.mockReset()
  serverRequest.mockReset()
  captureException.mockReset()
})

describe('refreshServicePageAfterReview', () => {
  it('reports backend 5xx failures to Sentry with source and requestId', async () => {
    serverRequest.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      error: 'Database error',
      requestId: 'req-svc-500',
    })

    await refreshServicePageAfterReview(14)

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).toHaveBeenCalledOnce()
    expect(captureException.mock.calls[0]?.[1]).toEqual({
      tags: { source: 'cache:revalidate-service', requestId: 'req-svc-500' },
      extra: { path: '/api/contracts/14', status: 500, requestId: 'req-svc-500' },
    })
  })

  it('skips bad ids and 4xx failures without reporting to Sentry', async () => {
    await refreshServicePageAfterReview(0)
    serverRequest.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      error: 'Forbidden',
    })
    await refreshServicePageAfterReview(14)

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })
})
