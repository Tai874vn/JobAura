import { beforeEach, describe, expect, it, vi } from 'vitest'

const { deleteJobAndRefresh, me } = vi.hoisted(() => ({ deleteJobAndRefresh: vi.fn(), me: vi.fn() }))
vi.mock('../refresh-job-pages', () => ({ deleteJobAndRefresh }))
vi.mock('@/shared/api/endpoints', () => ({ authApi: { me } }))

import { shouldReportServerError } from '@/shared/api/query-client'
import { RequestError, toUserError } from '@/shared/lib/errors'
import { deleteJob } from '../delete-job'

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

  it('forwards backend auth code so toUserError masks revoked-session 401 text', async () => {
    const authFailure = {
      ok: false as const,
      status: 401,
      message: 'Authentication session is invalid or revoked',
      code: 'SESSION_REVOKED',
      requestId: 'req-401',
    }
    deleteJobAndRefresh.mockResolvedValueOnce(authFailure).mockResolvedValueOnce(authFailure)

    let caught: unknown
    try {
      await deleteJob(5)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(RequestError)
    expect(toUserError(caught)).toEqual({
      message: "You don't have access to this.",
      requestId: 'req-401',
      status: 401,
      kind: 'auth',
    })
  })

  it('formats redacted 5xx once via toUserError without double-reporting to browser Sentry', async () => {
    deleteJobAndRefresh.mockResolvedValueOnce({
      ok: false,
      status: 500,
      message: '',
      requestId: 'req-del-500',
      reported: true,
    })

    let caught: unknown
    try {
      await deleteJob(5)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(RequestError)
    expect(shouldReportServerError(caught)).toBe(false)
    expect(toUserError(caught, 'Unable to delete service')).toEqual({
      message: 'Something went wrong. Please try again. (ref: req-del-500)',
      requestId: 'req-del-500',
      status: 500,
      kind: 'server',
    })
  })
})
