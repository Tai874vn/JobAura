import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServerRequestResult } from '@/shared/api/server'
import type { ApiResponse, HiringPost } from '@/shared/schemas'

const { notFoundMock, serverRequestMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  serverRequestMock: vi.fn<
    (path: string, options?: Record<string, unknown>) => Promise<ServerRequestResult<ApiResponse<HiringPost>>>
  >(),
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

vi.mock('@/shared/api/server', () => ({
  serverRequest: serverRequestMock,
}))

vi.mock('@/features/hiring/hiring-post-detail-view', () => ({
  HiringPostDetailView: ({ initialPost }: { initialPost: HiringPost }) => (
    <div data-testid="hiring-post-detail">
      {initialPost.title} ({initialPost.status})
    </div>
  ),
}))

import HiringPostPage, { generateMetadata } from './page'

function rawPost(overrides: Partial<HiringPost> = {}): HiringPost {
  return {
    id: 42,
    recruiterId: 9,
    title: 'Senior Backend Engineer',
    description: 'Build resilient APIs for JobAura.',
    requirements: null,
    location: 'Ho Chi Minh City',
    employmentType: 'FULL_TIME',
    salaryMin: 2000,
    salaryMax: 3500,
    companyName: 'JobAura Labs',
    occupationCode: null,
    occupationTitle: null,
    specialty: null,
    legacyField: null,
    yearsRequired: 4,
    skills: ['NestJS', 'PostgreSQL'],
    closesAt: null,
    aiStatus: null,
    aiStatusMessage: null,
    predictedSeniority: null,
    predictedSeniorityConfidence: null,
    predictedSeniorityModel: null,
    predictedSeniorityAt: null,
    status: 'OPEN',
    createdAt: '2026-11-20T00:00:00.000Z',
    updatedAt: '2026-11-20T00:00:00.000Z',
    applicationCount: 0,
    openings: 1,
    hiredCount: 0,
    offersWaiting: 0,
    viewerHasApplied: false,
    viewerApplication: null,
    ...overrides,
  }
}

describe('HiringPostPage', () => {
  beforeEach(() => {
    notFoundMock.mockClear()
    serverRequestMock.mockReset()
  })

  it('renders an open post from the cookie-less public read without retrying', async () => {
    serverRequestMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { content: rawPost({ id: 101, status: 'OPEN' }) },
    })

    const element = await HiringPostPage({ params: Promise.resolve({ id: '101' }) })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('Senior Backend Engineer (OPEN)')
    expect(serverRequestMock).toHaveBeenCalledTimes(1)
    expect(serverRequestMock).toHaveBeenCalledWith('/api/hiring-posts/101', {
      includeCookies: false,
      next: { revalidate: 120 },
    })
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it.each([
    [403, 'Forbidden', 'You cannot view this closed hiring post'],
    [401, 'Unauthorized', 'Authentication required'],
    [404, 'Not Found', 'Hiring post not found'],
    [400, 'Bad Request', 'Bad request'],
  ])(
    'retries with viewer cookies when the public read returns %i and renders the post if the cookie read succeeds',
    async (status, statusText, error) => {
      const id = 200 + status
      serverRequestMock
        .mockResolvedValueOnce({ ok: false, status, statusText, error })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { content: rawPost({ id, title: 'Closed Staff Role', status: 'CLOSED' }) },
        })

      const element = await HiringPostPage({ params: Promise.resolve({ id: String(id) }) })
      const html = renderToStaticMarkup(element)

      expect(html).toContain('Closed Staff Role (CLOSED)')
      expect(serverRequestMock).toHaveBeenCalledTimes(2)
      expect(serverRequestMock).toHaveBeenNthCalledWith(1, `/api/hiring-posts/${id}`, {
        includeCookies: false,
        next: { revalidate: 120 },
      })
      expect(serverRequestMock).toHaveBeenNthCalledWith(2, `/api/hiring-posts/${id}`)
      expect(notFoundMock).not.toHaveBeenCalled()
    },
  )

  it('marks a closed post retrieved via cookie retry as noindex in metadata', async () => {
    serverRequestMock
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        error: 'You cannot view this closed hiring post',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { content: rawPost({ id: 301, title: 'Closed Role', status: 'CLOSED' }) },
      })

    const metadata = await generateMetadata({ params: Promise.resolve({ id: '301' }) })

    expect(metadata.title).toBe('Closed Role at JobAura Labs')
    expect(metadata.robots).toEqual({ index: false, follow: false })
    expect(serverRequestMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    [403, 403, 'Forbidden', 'You cannot view this closed hiring post'],
    [404, 404, 'Not Found', 'Hiring post not found'],
    [401, 401, 'Unauthorized', 'Authentication required'],
  ])(
    'calls notFound() when public read returns %i and cookie retry returns %i',
    async (publicStatus, retryStatus, statusText, error) => {
      const id = 400 + publicStatus
      serverRequestMock
        .mockResolvedValueOnce({ ok: false, status: publicStatus, statusText, error })
        .mockResolvedValueOnce({ ok: false, status: retryStatus, statusText, error })

      await expect(HiringPostPage({ params: Promise.resolve({ id: String(id) }) })).rejects.toThrow('NEXT_NOT_FOUND')
      expect(notFoundMock).toHaveBeenCalledTimes(1)
      expect(serverRequestMock).toHaveBeenCalledTimes(2)
    },
  )

  it.each([
    [0, 'Network error', 'Unable to reach the API server'],
    [503, 'Service Unavailable', 'Backend restarting'],
  ])(
    'throws without retrying with cookies when the public read fails with status %i',
    async (status, statusText, error) => {
      const id = 500 + status
      serverRequestMock.mockResolvedValueOnce({ ok: false, status, statusText, error })

      await expect(HiringPostPage({ params: Promise.resolve({ id: String(id) }) })).rejects.toThrow(
        `Could not load hiring post #${id}: ${error}`,
      )
      expect(serverRequestMock).toHaveBeenCalledTimes(1)
      expect(notFoundMock).not.toHaveBeenCalled()
    },
  )

  it.each([
    [0, 'Network error', 'Connection reset'],
    [502, 'Bad Gateway', 'Upstream error'],
  ])(
    'throws for the error boundary when the cookie retry fails with status %i',
    async (retryStatus, statusText, error) => {
      const id = 700 + retryStatus
      serverRequestMock
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          error: 'You cannot view this closed hiring post',
        })
        .mockResolvedValueOnce({ ok: false, status: retryStatus, statusText, error })

      await expect(HiringPostPage({ params: Promise.resolve({ id: String(id) }) })).rejects.toThrow(
        `Could not load hiring post #${id}: ${error}`,
      )
      expect(serverRequestMock).toHaveBeenCalledTimes(2)
      expect(notFoundMock).not.toHaveBeenCalled()
    },
  )
})
