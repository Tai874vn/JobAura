import { beforeEach, describe, expect, it, vi } from 'vitest'

const { deleteJobAndRefresh, me } = vi.hoisted(() => ({ deleteJobAndRefresh: vi.fn(), me: vi.fn() }))
vi.mock('./refresh-job-pages', () => ({ deleteJobAndRefresh }))
vi.mock('@/shared/api/endpoints', () => ({ authApi: { me } }))

import { deleteJob } from './delete-job'

beforeEach(() => {
  deleteJobAndRefresh.mockReset()
  me.mockReset()
})

describe('deleteJob', () => {
  it('deletes through the server action', async () => {
    deleteJobAndRefresh.mockResolvedValueOnce({ ok: true })

    await deleteJob(5)

    expect(deleteJobAndRefresh).toHaveBeenCalledWith(5)
    expect(me).not.toHaveBeenCalled()
  })

  it('renews an expired sign-in once and tries again', async () => {
    deleteJobAndRefresh
      .mockResolvedValueOnce({ ok: false, status: 401, message: 'Expired' })
      .mockResolvedValueOnce({ ok: true })

    await deleteJob(5)

    expect(me).toHaveBeenCalledTimes(1)
    expect(deleteJobAndRefresh).toHaveBeenCalledTimes(2)
  })

  it('throws the backend sentence when the delete fails', async () => {
    deleteJobAndRefresh.mockResolvedValueOnce({ ok: false, status: 403, message: 'Not your post' })

    await expect(deleteJob(5)).rejects.toThrow('Not your post')
  })
})
