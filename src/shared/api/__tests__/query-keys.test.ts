import { describe, expect, it } from 'vitest'
import { contractKeys, pipelineKeys, queryKeys, viewerScope, walletKeys } from '../query-keys'

describe('query keys', () => {
  it('normalizes viewer ids into a stable cache scope', () => {
    expect(viewerScope(12)).toBe(12)
    expect(viewerScope(0)).toBe('anon')
    expect(viewerScope(null)).toBe('anon')
    expect(viewerScope(undefined)).toBe('anon')
  })

  it('returns stable key prefixes and parameterized keys', () => {
    expect(queryKeys.me).toEqual(['auth', 'me'])
    expect(queryKeys.job(3)).toEqual(['jobs', 3])
    expect(queryKeys.chatMessages(7, 4)).toEqual(['chat', 'messages', 4, 7])
    expect(queryKeys.notifications(4)).toEqual(['notifications', 'list', 4])
    expect(queryKeys.notificationUnreadCount(4)).toEqual(['notifications', 'unread-count', 4])
  })

  it('isolates viewer-scoped query keys across accounts and visitors', () => {
    expect(queryKeys.hiringPosts({ page: 1 }, null)).toEqual(['hiring-posts', 'anon', { page: 1 }])
    expect(queryKeys.hiringPosts({ page: 1 }, 5)).toEqual(['hiring-posts', 5, { page: 1 }])
    expect(queryKeys.hiringPosts({ page: 1 }, 5)).not.toEqual(queryKeys.hiringPosts({ page: 1 }, 6))

    expect(queryKeys.myHiringPosts({ page: 1 }, 5)).toEqual(['hiring-posts', 'mine', 5, { page: 1 }])
    expect(queryKeys.myHiringPosts({ page: 1 }, 5)).not.toEqual(queryKeys.myHiringPosts({ page: 1 }, 6))
    expect(queryKeys.myHiringPosts({ page: 1 }, undefined)).toEqual(['hiring-posts', 'mine', 'anon', { page: 1 }])

    expect(queryKeys.candidates({ page: 1 }, 5)).toEqual(['users', 'candidates', 5, { page: 1 }])
    expect(queryKeys.candidates({ page: 1 }, 5)).not.toEqual(queryKeys.candidates({ page: 1 }, 6))
    expect(queryKeys.candidates({ page: 1 }, null)).toEqual(['users', 'candidates', 'anon', { page: 1 }])

    expect(queryKeys.viewerRecommendationQuota(5)).toEqual(['recommendations', 'quota', 5])
    expect(queryKeys.viewerRecommendationQuota(5)).not.toEqual(queryKeys.viewerRecommendationQuota(6))
    expect(queryKeys.viewerRecommendationQuota(undefined)).toEqual(['recommendations', 'quota', 'anon'])

    expect(queryKeys.recommendedCandidates(12, { topK: 5 }, 5)).toEqual([
      'recommendations',
      'hiring-posts',
      12,
      'candidates',
      5,
      { topK: 5 },
    ])
    expect(queryKeys.recommendedCandidates(12, { topK: 5 }, 5)).not.toEqual(
      queryKeys.recommendedCandidates(12, { topK: 5 }, 6),
    )

    expect(queryKeys.feed(5)).not.toEqual(queryKeys.feed(6))
    expect(queryKeys.myResume(5)).not.toEqual(queryKeys.myResume(6))
    expect(queryKeys.savedPosts(5)).not.toEqual(queryKeys.savedPosts(6))
    expect(queryKeys.connectionStatus(9, 5)).not.toEqual(queryKeys.connectionStatus(9, 6))
    expect(queryKeys.adminStats(1)).not.toEqual(queryKeys.adminStats(2))

    expect(pipelineKeys.detail(10, 5)).not.toEqual(pipelineKeys.detail(10, 6))
    expect(pipelineKeys.list(3, { page: 1 }, 5)).not.toEqual(pipelineKeys.list(3, { page: 1 }, 6))
    expect(pipelineKeys.upcoming(5)).not.toEqual(pipelineKeys.upcoming(6))

    expect(contractKeys.proposal(5, 1)).not.toEqual(contractKeys.proposal(5, 2))
    expect(contractKeys.contract(7, 1)).not.toEqual(contractKeys.contract(7, 2))
    expect(contractKeys.proposals({ role: 'client', page: 1 }, 1)).toEqual([
      'contracts',
      'proposals',
      1,
      { role: 'client', page: 1 },
    ])
    expect(contractKeys.proposals({ role: 'client', page: 1 }, 1)).not.toEqual(
      contractKeys.proposals({ role: 'client', page: 1 }, 2),
    )
    expect(contractKeys.proposals({ role: 'client', page: 1 }, undefined)).toEqual([
      'contracts',
      'proposals',
      'anon',
      { role: 'client', page: 1 },
    ])
    expect(contractKeys.contracts({ role: 'client', page: 1 }, 1)).toEqual([
      'contracts',
      'list',
      1,
      { role: 'client', page: 1 },
    ])
    expect(contractKeys.contracts({ role: 'client', page: 1 }, 1)).not.toEqual(
      contractKeys.contracts({ role: 'client', page: 1 }, 2),
    )
    expect(contractKeys.contracts({ role: 'client', page: 1 }, null)).toEqual([
      'contracts',
      'list',
      'anon',
      { role: 'client', page: 1 },
    ])

    expect(walletKeys.summary(1)).not.toEqual(walletKeys.summary(2))
    expect(walletKeys.ledger({ pageSize: 20 }, 1)).toEqual(['wallet', 'ledger', 1, { pageSize: 20 }])
    expect(walletKeys.ledger({ pageSize: 20 }, 1)).not.toEqual(walletKeys.ledger({ pageSize: 20 }, 2))
    expect(walletKeys.ledger({ pageSize: 20 }, undefined)).toEqual(['wallet', 'ledger', 'anon', { pageSize: 20 }])
    expect(walletKeys.topUpStatus(7, 1)).not.toEqual(walletKeys.topUpStatus(7, 2))
  })

  it('uses empty objects for missing params', () => {
    expect(queryKeys.jobs()).toEqual(['jobs', {}])
    expect(queryKeys.users()).toEqual(['users', {}])
  })

  it('returns stable recommendation keys', () => {
    expect(queryKeys.recommendedJobs({ topK: 4 }, 9)).toEqual(['recommendations', 'jobs', 9, { topK: 4 }])
    expect(queryKeys.viewerRecommendationQuota(9)).toEqual(['recommendations', 'quota', 9])
    expect(queryKeys.recommendedCandidates(12, { topK: 5 })).toEqual([
      'recommendations',
      'hiring-posts',
      12,
      'candidates',
      'anon',
      { topK: 5 },
    ])
  })

  it('returns stable cursor job keys', () => {
    expect(queryKeys.jobsCursor({ keyword: 'python' })).toEqual(['jobs', 'cursor', { keyword: 'python' }])
  })

  it('separates finite saved-job previews from infinite saved-job pages', () => {
    expect(queryKeys.savedJobsPreview(5)).not.toEqual(queryKeys.savedJobs(5))
    expect(queryKeys.savedJobs(5)).toEqual(['saved', 'jobs', 'pages', 5])
    expect(queryKeys.savedJobsPreview(5)).toEqual(['saved', 'jobs', 'preview', 5])
  })

  it('uses distinct keys for creator jobs and admin statistics', () => {
    expect(queryKeys.jobsByCreator(8, { page: 1 })).toEqual(['jobs', 'creator', 8, { page: 1 }])
    expect(queryKeys.adminStats(1)).toEqual(['admin', 'stats', 1])
  })
})
