import { describe, expect, it } from 'vitest'
import {
  normalizeCategory,
  normalizeComment,
  normalizeHiredJob,
  normalizeFeedResponse,
  normalizeConnectionRequestsResponse,
  normalizeConnectionsResponse,
  normalizeSavedJobsResponse,
  normalizeJob,
  normalizeJobResponse,
  normalizeJobsResponse,
  normalizeNotificationsResponse,
  normalizePaginatedJobsResponse,
  normalizePaginatedCandidatesResponse,
  normalizeRecommendedCandidatesResponse,
  normalizeRecommendedJobsResponse,
  normalizeSubcategory,
  toCategoryPayload,
  toCommentPayload,
  toJobPayload,
  toSubcategoryPayload,
} from './normalizers'

describe('normalizers', () => {
  it('normalizes the social feed contract and preserves its cursor', () => {
    const response = normalizeFeedResponse({
      content: {
        data: [
          {
            id: 12,
            content: 'Shipping a new portfolio today.',
            imageUrl: '/posts/work.png',
            createdAt: '2026-06-19T02:00:00.000Z',
            updatedAt: '2026-06-19T02:00:00.000Z',
            author: { id: 6, name: 'Tai', avatar: null, headline: 'Backend developer' },
            likeCount: 4,
            commentCount: 1,
            viewerHasLiked: true,
            recentComments: [
              {
                id: 3,
                postId: 12,
                authorId: 8,
                content: 'Looks strong.',
                createdAt: '2026-06-19T02:05:00.000Z',
                author: { id: 8, name: 'Lina', avatar: null, headline: null },
              },
            ],
          },
        ],
        nextCursor: 'connections-cursor',
      },
    } as never)

    expect(response.content?.nextCursor).toBe('connections-cursor')
    expect(response.content?.data[0]).toMatchObject({
      id: 12,
      likeCount: 4,
      viewerHasLiked: true,
      author: { id: 6, name: 'Tai' },
      recentComments: [{ id: 3, content: 'Looks strong.' }],
    })
  })

  it('normalizes notifications with actor metadata and numeric cursors', () => {
    const response = normalizeNotificationsResponse({
      content: {
        data: [
          {
            id: 9,
            recipientId: 6,
            actorId: 7,
            type: 'POST_COMMENT',
            title: 'New comment',
            body: 'Looks great.',
            entityType: 'post_comment',
            entityId: 4,
            actionUrl: '/?postId=3',
            metadata: { postId: 3, commentId: 4 },
            readAt: null,
            createdAt: '2026-07-01T02:00:00.000Z',
            actor: { id: 7, name: 'Lina', avatar: null, headline: 'Security analyst' },
          },
        ],
        nextCursor: 8,
      },
    } as never)

    expect(response.content?.nextCursor).toBe(8)
    expect(response.content?.data[0]).toMatchObject({
      id: 9,
      type: 'POST_COMMENT',
      actor: { id: 7, name: 'Lina' },
      metadata: { postId: 3, commentId: 4 },
    })
  })

  it('normalizes saved jobs and connection responses', () => {
    const savedJobs = normalizeSavedJobsResponse({
      content: {
        data: [{ id: 4, title: 'NestJS API', price: 500 }],
        nextCursor: 'saved-cursor',
      },
    } as never)
    expect(savedJobs.content?.data[0].tenCongViec).toBe('NestJS API')
    expect(savedJobs.content?.nextCursor).toBe('saved-cursor')

    const connections = normalizeConnectionsResponse({
      content: {
        pageIndex: 1,
        pageSize: 12,
        totalRow: 1,
        data: [{
          id: 3,
          status: 'ACCEPTED',
          user: { id: 8, name: 'Maya', headline: 'Developer', profileSkills: [{ name: 'NestJS' }] },
        }],
      },
    } as never)
    expect(connections.content?.data[0].user).toMatchObject({ id: 8, name: 'Maya' })

    const requests = normalizeConnectionRequestsResponse({
      content: {
        incoming: [{ id: 4, direction: 'incoming', user: { id: 9, name: 'Alex' } }],
        outgoing: [],
        incomingCount: 1,
      },
    } as never)
    expect(requests.content?.incomingCount).toBe(1)
    expect(requests.content?.incoming[0].direction).toBe('incoming')
  })

  it('normalizes category and subcategory using fallback keys', () => {
    expect(normalizeCategory({ id: 3, name: 'Design' })).toEqual({ id: 3, name: 'Design', tenLoaiCongViec: 'Design' })

    expect(normalizeSubcategory({ id: 8, name: 'Logo', image: '/logo.png', categoryId: 3 })).toMatchObject({
      id: 8,
      name: 'Logo',
      tenChiTiet: 'Logo',
      hinhAnh: '/logo.png',
      maLoaiCongViec: 3,
    })
  })

  it('normalizes jobs, comments, and hired jobs', () => {
    const job = normalizeJob({
      id: 10,
      title: 'Landing page',
      price: 120,
      shortDescription: 'Fast delivery',
      description: 'Build and deploy',
      subcategoryId: 8,
      creatorId: 2,
      image: '/job.png',
      reviews: 5,
      rating: 4.8,
      subcategory: { id: 8, name: 'Logo' },
    })
    expect(job.tenCongViec).toBe('Landing page')
    expect(job.giaTien).toBe(120)
    expect(job.nguoiTao).toBe(2)
    expect(job.chiTietLoaiCongViec?.tenChiTiet).toBe('Logo')

    const aliasedOwner = normalizeJob({
      id: 11,
      title: 'Backend API',
      price: 240,
      userId: 6,
      creator: { id: 6, name: 'Tai', avatar: null },
    })
    expect(aliasedOwner.nguoiTao).toBe(6)
    expect(aliasedOwner.nguoiDung?.id).toBe(6)

    expect(normalizeComment({ id: 1, jobId: 10, userId: 2, content: 'Great', rating: 5 })).toEqual({
      id: 1,
      jobId: 10,
      userId: 2,
      content: 'Great',
      rating: 5,
      maCongViec: 10,
      maNguoiBinhLuan: 2,
      ngayBinhLuan: undefined,
      noiDung: 'Great',
      saoBinhLuan: 5,
      nguoiDung: undefined,
    })

    const backendComment = normalizeComment({
      id: 6,
      jobId: 7,
      commenterId: 6,
      commentedAt: '2026-06-16T03:03:00.216Z',
      content: 'Works well',
      rating: 5,
      user: { id: 6, name: 'Tai', avatar: '/avatar.png' },
    })
    expect(backendComment.maNguoiBinhLuan).toBe(6)
    expect(backendComment.ngayBinhLuan).toBe('2026-06-16T03:03:00.216Z')
    expect(backendComment.nguoiDung?.name).toBe('Tai')

    const hiredJob = normalizeHiredJob({ id: 4, jobId: 10, userId: 9, completed: true, job: { id: 10, title: 'Landing page', price: 120 } })
    expect(hiredJob.maCongViec).toBe(10)
    expect(hiredJob.hoanThanh).toBe(true)
    expect(hiredJob.congViec?.tenCongViec).toBe('Landing page')
  })

  it('normalizes list and paginated responses while preserving metadata', () => {
    expect(normalizeJobsResponse({ message: 'ok' })).toEqual({ message: 'ok' })

    const response = normalizePaginatedJobsResponse({
      statusCode: 200,
      content: {
        page: 2,
        pageSize: 10,
        total: 21,
        data: [{ id: 1, title: 'Test', price: 5 }],
      },
    } as never)

    expect(response.statusCode).toBe(200)
    expect(response.content?.pageIndex).toBe(2)
    expect(response.content?.totalRow).toBe(21)
    expect(response.content?.data[0].tenCongViec).toBe('Test')
  })

  it('normalizes paginated candidate directory responses without private contact fields', () => {
    const response = normalizePaginatedCandidatesResponse({
      content: {
        page: 2,
        pageSize: 12,
        total: 13,
        totalPages: 2,
        data: [
          {
            id: 10,
            name: 'Lina Tran',
            email: 'private@example.com',
            phone: '+85511111111',
            avatar: '/avatar.png',
            headline: 'Senior Backend Engineer',
            bio: 'Builds Python APIs',
            location: 'Remote',
            profileSkills: [{ id: 1, name: 'Python', level: 'advanced' }],
            stats: {
              portfolioItems: 2,
              certifications: 1,
              completedWork: 4,
              rating: 4.8,
            },
            match: {
              score: 0.84,
              label: 'high_match',
              keywordScore: 1,
              skillScore: 1,
              locationScore: 1,
              qualityScore: 0.76,
            },
          },
        ],
      },
    } as never)

    expect(response.content?.pageIndex).toBe(2)
    expect(response.content?.totalRow).toBe(13)
    expect(response.content?.totalPages).toBe(2)
    expect(response.content?.data[0]).toMatchObject({
      id: 10,
      name: 'Lina Tran',
      headline: 'Senior Backend Engineer',
      profileSkills: [{ id: 1, name: 'Python', level: 'advanced' }],
      stats: { completedWork: 4, rating: 4.8 },
      match: { score: 0.84, label: 'high_match' },
    })
    expect(response.content?.data[0]).not.toHaveProperty('email')
    expect(response.content?.data[0]).not.toHaveProperty('phone')
  })

  it('normalizes detailed job response comments from either key', () => {
    const withComments = normalizeJobResponse({
      content: {
        id: 6,
        title: 'QA',
        price: 99,
        comments: [{ id: 2, jobId: 6, comment: 'Solid', rating: 4 }],
      },
    } as never)
    expect(withComments.content?.binhLuans?.[0].noiDung).toBe('Solid')
  })

  it('normalizes recommendation responses while preserving match metadata', () => {
    const jobs = normalizeRecommendedJobsResponse({
      content: {
        data: [
          {
            id: 3,
            title: 'Python API',
            price: 200,
            recommendation: {
              rank: 1,
              score: 0.84,
              finalScore: 0.78,
              label: 'high_match',
              skillScore: 0.6,
            },
          },
        ],
        model: 'embedding-model',
        elapsedMs: 42,
      },
    } as never)

    expect(jobs.content?.model).toBe('embedding-model')
    expect(jobs.content?.data[0].tenCongViec).toBe('Python API')
    expect(jobs.content?.data[0].recommendation.aiScore).toBe(0.84)
    expect(jobs.content?.data[0].recommendation.label).toBe('high_match')

    const candidates = normalizeRecommendedCandidatesResponse({
      content: {
        data: [
          {
            id: 8,
            name: 'Lina Tran',
            email: 'lina@example.com',
            headline: 'Backend developer',
            profileSkills: [{ name: 'Python' }],
            recommendation: {
              rank: 2,
              aiScore: 0.63,
              finalScore: 0.61,
              label: 'medium_match',
            },
          },
        ],
      },
    } as never)

    expect(candidates.content?.data[0].name).toBe('Lina Tran')
    expect(candidates.content?.data[0].recommendation.rank).toBe(2)
  })

  it('maps payloads to API contract keys', () => {
    expect(
      toJobPayload({
        tenCongViec: 'UI Design',
        giaTien: 30,
        moTaNgan: 'short',
        moTa: 'long',
        maChiTietLoai: 7,
        danhGia: 2,
        saoCongViec: 3,
      })
    ).toEqual({
      title: 'UI Design',
      price: 30,
      shortDescription: 'short',
      description: 'long',
      subcategoryId: 7,
      reviews: 2,
      rating: 3,
    })

    expect(toCategoryPayload({ tenLoaiCongViec: 'Web' })).toEqual({ name: 'Web' })
    expect(toSubcategoryPayload({ tenChiTiet: 'Frontend', hinhAnh: '/a.png', maLoaiCongViec: 1 })).toEqual({
      name: 'Frontend',
      image: '/a.png',
      categoryId: 1,
    })
    expect(toCommentPayload({ maCongViec: 4, noiDung: 'Nice', saoBinhLuan: 5 })).toEqual({
      jobId: 4,
      content: 'Nice',
      rating: 5,
    })
  })
})
