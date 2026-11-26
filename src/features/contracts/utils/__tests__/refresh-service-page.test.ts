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

import { refreshServicePageAfterReview } from '../refresh-service-page'

const ok = (content: unknown) => ({ ok: true, status: 200, data: { content } })
const reviewedContract = {
  id: 14,
  status: 'COMPLETED',
  endReason: null,
  imported: false,
  title: 'Logo design',
  brief: 'Brand mark',
  referenceLinks: [],
  referenceImages: [],
  deadline: '2099-12-10T16:59:00.000Z',
  job: { id: 9, title: 'Logo design', image: null, price: 1000 },
  client: { id: 1, name: 'Ann Client', avatar: null },
  freelancer: { id: 22, name: 'Bob Maker', avatar: null },
  proposalId: null,
  total: 1000,
  paid: 1000,
  held: 0,
  remaining: 0,
  milestones: [],
  amendments: [],
  endRequest: null,
  review: { id: 77, rating: 5, content: 'Great work' },
  canReview: false,
  graceMinutes: 4320,
  events: [],
  viewerRole: 'client',
  createdAt: '2026-11-20T00:00:00.000Z',
  completedAt: '2026-11-22T00:00:00.000Z',
  endedAt: null,
}

function backend(me: unknown, contract: unknown) {
  serverRequest.mockImplementation(async (path: string) => (path === '/api/auth/me' ? me : contract))
}

beforeEach(() => {
  revalidatePath.mockReset()
  serverRequest.mockReset()
  captureException.mockReset()
})

describe('refreshServicePageAfterReview', () => {
  it('revalidates /jobs, /welcome, the service page, and the freelancer profile for an authenticated contract member', async () => {
    backend(ok({ id: 1, role: 'user' }), ok(reviewedContract))

    await refreshServicePageAfterReview(14)

    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      '/jobs',
      '/welcome',
      '/jobs/9',
      '/profile/22',
    ])
  })

  it('allows an admin to revalidate a reviewed contract', async () => {
    backend(ok({ id: 99, role: 'admin' }), ok(reviewedContract))

    await refreshServicePageAfterReview(14)

    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      '/jobs',
      '/welcome',
      '/jobs/9',
      '/profile/22',
    ])
  })

  it('does nothing for an unauthenticated caller, unrelated user, or unreviewed contract', async () => {
    backend({ ok: false, status: 401, statusText: 'Unauthorized', error: 'Unauthorized' }, ok(reviewedContract))
    await refreshServicePageAfterReview(14)

    backend(ok({ id: 99, role: 'user' }), ok(reviewedContract))
    await refreshServicePageAfterReview(14)

    backend(ok({ id: 1, role: 'user' }), ok({ ...reviewedContract, review: null }))
    await refreshServicePageAfterReview(14)

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports backend 5xx failures to Sentry with source and requestId', async () => {
    backend(ok({ id: 1, role: 'user' }), {
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
    backend(ok({ id: 1, role: 'user' }), {
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
