import { beforeEach, describe, expect, it, vi } from 'vitest'

const { revalidatePath, serverRequest } = vi.hoisted(() => ({ revalidatePath: vi.fn(), serverRequest: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/shared/api/server', () => ({ serverRequest }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ toString: () => 'access_token=a; csrf_token=tok123' }),
  headers: async () => new Headers({ origin: 'https://jobaura.example' }),
}))

import { deleteJobAndRefresh, refreshJobPagesAfterSave } from './refresh-job-pages'

const ok = (content: unknown) => ({ ok: true, status: 200, data: { content } })
const fail = (status: number) => ({ ok: false, status, statusText: '', error: '' })

/** Answers /api/auth/me and the job read with the given results. */
function backend(me: unknown, job: unknown) {
  serverRequest.mockImplementation(async (path: string) => (path === '/api/auth/me' ? me : job))
}

beforeEach(() => {
  revalidatePath.mockReset()
  serverRequest.mockReset()
})

describe('refreshJobPagesAfterSave', () => {
  it('clears the lists, the post and the owner profile, with ids taken from the server', async () => {
    backend(ok({ id: 11, role: 'user' }), ok({ id: 5, title: 'Logo', price: 0, creatorId: 11 }))

    await refreshJobPagesAfterSave(5)

    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual(['/jobs', '/welcome', '/jobs/5', '/profile/11'])
  })

  it('does nothing for someone who does not own the post', async () => {
    backend(ok({ id: 12, role: 'user' }), ok({ id: 5, title: 'Logo', price: 0, creatorId: 11 }))

    await refreshJobPagesAfterSave(5)

    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('does nothing for a visitor or a bad id', async () => {
    backend(fail(401), ok({ id: 5, title: 'Logo', price: 0, creatorId: 11 }))
    await refreshJobPagesAfterSave(5)
    await refreshJobPagesAfterSave(-1)
    await refreshJobPagesAfterSave(Number.NaN)

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('deleteJobAndRefresh', () => {
  /** Answers the job read and the DELETE with the given results. */
  function deleteBackend(job: unknown, deleted: unknown) {
    serverRequest.mockImplementation(async (_path: string, options?: { method?: string }) =>
      options?.method === 'DELETE' ? deleted : job,
    )
  }

  it('deletes with the caller cookies and CSRF header, then clears pages built from the server answer', async () => {
    deleteBackend(ok({ id: 5, title: 'Logo', price: 0, user: { id: 11 } }), ok(null))

    await expect(deleteJobAndRefresh(5)).resolves.toEqual({ ok: true })

    const deleteCall = serverRequest.mock.calls.find(([, options]) => options?.method === 'DELETE')!
    expect(deleteCall[0]).toBe('/api/jobs/5')
    expect(deleteCall[1].includeCookies).toBeUndefined()
    expect((deleteCall[1].headers as Headers).get('X-CSRF-Token')).toBe('tok123')
    expect((deleteCall[1].headers as Headers).get('origin')).toBe('https://jobaura.example')
    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual(['/jobs', '/welcome', '/jobs/5', '/profile/11'])
  })

  it('clears nothing when the backend refuses the delete, and passes on its sentence', async () => {
    deleteBackend(ok({ id: 5, title: 'Logo', price: 0, user: { id: 11 } }), { ok: false, status: 403, statusText: '', error: 'Not your post' })

    await expect(deleteJobAndRefresh(5)).resolves.toEqual({ ok: false, status: 403, message: 'Not your post' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('sends no delete and clears nothing for a missing post or a bad id', async () => {
    deleteBackend(fail(404), ok(null))
    await expect(deleteJobAndRefresh(99999999)).resolves.toMatchObject({ ok: false, status: 404 })
    await expect(deleteJobAndRefresh(-1)).resolves.toMatchObject({ ok: false, status: 400 })

    expect(serverRequest.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
