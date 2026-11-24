import { beforeEach, describe, expect, it, vi } from 'vitest'

const { revalidatePath, serverRequest } = vi.hoisted(() => ({ revalidatePath: vi.fn(), serverRequest: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/shared/api/server', () => ({ serverRequest }))

import { refreshMarketplaceTaxonomyPages } from '@/features/admin/refresh-taxonomy-pages'
import { refreshMyProfilePage } from './refresh-profile-page'

const me = (content: unknown) => serverRequest.mockResolvedValue({ ok: true, status: 200, data: { content } })
const noSession = () => serverRequest.mockResolvedValue({ ok: false, status: 401, statusText: '', error: '' })

beforeEach(() => {
  revalidatePath.mockReset()
  serverRequest.mockReset()
})

describe('refreshMyProfilePage', () => {
  it("clears only the caller's own profile, with the id from /api/auth/me", async () => {
    me({ id: 11, role: 'user' })

    await refreshMyProfilePage()

    expect(serverRequest).toHaveBeenCalledWith('/api/auth/me')
    expect(revalidatePath.mock.calls).toEqual([['/profile/11']])
  })

  it('does nothing without a session or with a bad id', async () => {
    noSession()
    await refreshMyProfilePage()
    me({ id: 0 })
    await refreshMyProfilePage()

    expect(revalidatePath).not.toHaveBeenCalled()
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
  })
})
