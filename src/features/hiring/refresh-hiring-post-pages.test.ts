import { beforeEach, describe, expect, it, vi } from 'vitest'

const { revalidatePath, serverRequest } = vi.hoisted(() => ({ revalidatePath: vi.fn(), serverRequest: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/shared/api/server', () => ({ serverRequest }))

import { refreshHiringPostPages } from './refresh-hiring-post-pages'

const ok = (content: unknown) => ({ ok: true, status: 200, data: { content } })
const post = { id: 42, recruiterId: 9, title: 'Backend engineer', description: 'APIs', status: 'CLOSED', skills: [] }

function backend(me: unknown, hiringPost: unknown) {
  serverRequest.mockImplementation(async (path: string) => (path === '/api/auth/me' ? me : hiringPost))
}

beforeEach(() => {
  revalidatePath.mockReset()
  serverRequest.mockReset()
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

  it('does nothing for another recruiter, a visitor or a bad id', async () => {
    backend(ok({ id: 10, role: 'employer' }), ok(post))
    await refreshHiringPostPages(42)
    backend({ ok: false, status: 401, statusText: '', error: '' }, ok(post))
    await refreshHiringPostPages(42)
    await refreshHiringPostPages(0)

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
