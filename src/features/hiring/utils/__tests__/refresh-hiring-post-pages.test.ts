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

import { refreshHiringPostPages } from '../refresh-hiring-post-pages'

const ok = (content: unknown) => ({ ok: true, status: 200, data: { content } })
const post = { id: 42, recruiterId: 9, title: 'Backend engineer', description: 'APIs', status: 'CLOSED', skills: [] }

function backend(me: unknown, hiringPost: unknown) {
  serverRequest.mockImplementation(async (path: string) => (path === '/api/auth/me' ? me : hiringPost))
}

beforeEach(() => {
  revalidatePath.mockReset()
  serverRequest.mockReset()
  captureException.mockReset()
})

describe('refreshHiringPostPages', () => {
  it('clears the list and the post page for its recruiter', async () => {
    backend(ok({ id: 9, role: 'employer' }), ok(post))

    await refreshHiringPostPages(42)

    expect(serverRequest).toHaveBeenCalledWith('/api/hiring-posts/42')
    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual(['/hiring-posts', '/hiring-posts/42'])
  })

  it('lets an admin clear any post', async () => {
    backend(ok({ id: 1, role: 'admin' }), ok(post))

    await refreshHiringPostPages(42)

    expect(revalidatePath).toHaveBeenCalledTimes(2)
  })

  it('does nothing for another recruiter, a visitor or a bad id and skips 4xx Sentry reporting', async () => {
    backend(ok({ id: 10, role: 'employer' }), ok(post))
    await refreshHiringPostPages(42)
    backend({ ok: false, status: 401, statusText: '', error: '' }, ok(post))
    await refreshHiringPostPages(42)
    await refreshHiringPostPages(0)

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports backend 5xx failures to Sentry with source and requestId', async () => {
    backend(ok({ id: 9, role: 'employer' }), {
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      error: 'DB timeout',
      requestId: 'req-hp-503',
    })

    await refreshHiringPostPages(42)

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(captureException).toHaveBeenCalledOnce()
    expect(captureException.mock.calls[0]?.[1]).toEqual({
      tags: { source: 'cache:revalidate-hiring-post', requestId: 'req-hp-503' },
      extra: { path: '/api/hiring-posts/42', status: 503, requestId: 'req-hp-503' },
    })
  })

  it('lets the hired candidate clear the post pages when accepting an offer closed the post', async () => {
    backend(
      ok({ id: 25, role: 'user' }),
      ok({
        id: 77,
        hiringPostId: 42,
        applicantId: 25,
        status: 'HIRED',
        hiringPost: post,
      }),
    )

    await refreshHiringPostPages(42, { applicationId: 77 })

    expect(serverRequest).toHaveBeenCalledWith('/api/applications/77')
    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual(['/hiring-posts', '/hiring-posts/42'])
  })

  it('ignores candidate revalidation when the post is still open, not hired, or owned by another applicant', async () => {
    backend(
      ok({ id: 25, role: 'user' }),
      ok({
        id: 77,
        hiringPostId: 42,
        applicantId: 25,
        status: 'HIRED',
        hiringPost: { ...post, status: 'OPEN' },
      }),
    )
    await refreshHiringPostPages(42, { applicationId: 77 })

    backend(
      ok({ id: 26, role: 'user' }),
      ok({
        id: 77,
        hiringPostId: 42,
        applicantId: 25,
        status: 'HIRED',
        hiringPost: post,
      }),
    )
    await refreshHiringPostPages(42, { applicationId: 77 })

    backend(
      ok({ id: 25, role: 'user' }),
      ok({
        id: 77,
        hiringPostId: 42,
        applicantId: 25,
        status: 'OFFERED',
        hiringPost: post,
      }),
    )
    await refreshHiringPostPages(42, { applicationId: 77 })

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
