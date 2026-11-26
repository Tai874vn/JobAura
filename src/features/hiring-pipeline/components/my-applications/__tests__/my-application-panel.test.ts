import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationDetail } from '@/shared/schemas'

const { refreshHiringPostPages } = vi.hoisted(() => ({
  refreshHiringPostPages: vi.fn(),
}))

vi.mock('@/features/hiring/utils/refresh-hiring-post-pages', () => ({ refreshHiringPostPages }))

import { refreshClosedPostAfterAccept } from '../my-application-panel'

const applicationWithPost = (postStatus: 'OPEN' | 'CLOSED'): ApplicationDetail => ({
  id: 77,
  hiringPostId: 42,
  applicantId: 25,
  status: 'HIRED',
  interviews: [],
  events: [],
  hiringPost: {
    id: 42,
    recruiterId: 9,
    title: 'Backend engineer',
    description: 'APIs',
    status: postStatus,
    skills: [],
    applicationCount: 1,
    viewerHasApplied: true,
  },
})

beforeEach(() => {
  refreshHiringPostPages.mockReset()
  refreshHiringPostPages.mockResolvedValue(undefined)
})

describe('refreshClosedPostAfterAccept', () => {
  it('revalidates the hiring post pages when accepting an offer closes the post', () => {
    refreshClosedPostAfterAccept({ type: 'accept' }, applicationWithPost('CLOSED'))

    expect(refreshHiringPostPages).toHaveBeenCalledWith(42, { applicationId: 77 })
  })

  it('does not revalidate when accepting an offer leaves the post open', () => {
    refreshClosedPostAfterAccept({ type: 'accept' }, applicationWithPost('OPEN'))

    expect(refreshHiringPostPages).not.toHaveBeenCalled()
  })

  it('does not revalidate for other application actions', () => {
    refreshClosedPostAfterAccept({ type: 'withdraw' }, applicationWithPost('CLOSED'))
    refreshClosedPostAfterAccept({ type: 'decline' }, applicationWithPost('CLOSED'))

    expect(refreshHiringPostPages).not.toHaveBeenCalled()
  })
})
