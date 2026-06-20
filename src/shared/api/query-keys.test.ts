import { describe, expect, it } from 'vitest'
import { queryKeys } from './query-keys'

describe('query keys', () => {
  it('returns stable key prefixes and parameterized keys', () => {
    expect(queryKeys.me).toEqual(['auth', 'me'])
    expect(queryKeys.job(3)).toEqual(['jobs', 3])
    expect(queryKeys.chatMessages(7)).toEqual(['chat', 'messages', 7])
  })

  it('uses empty objects for missing params', () => {
    expect(queryKeys.jobs()).toEqual(['jobs', {}])
    expect(queryKeys.users()).toEqual(['users', {}])
  })

  it('returns stable recommendation keys', () => {
    expect(queryKeys.recommendedJobs({ topK: 4 })).toEqual(['recommendations', 'jobs', { topK: 4 }])
    expect(queryKeys.recommendedCandidates(12, { topK: 5 })).toEqual(['recommendations', 'jobs', 12, 'candidates', { topK: 5 }])
  })

  it('separates finite saved-job previews from infinite saved-job pages', () => {
    expect(queryKeys.savedJobsPreview).not.toEqual(queryKeys.savedJobs)
    expect(queryKeys.savedJobs).toEqual(['saved', 'jobs', 'pages'])
    expect(queryKeys.savedJobsPreview).toEqual(['saved', 'jobs', 'preview'])
  })

  it('uses distinct keys for creator jobs and admin statistics', () => {
    expect(queryKeys.jobsByCreator(8, { page: 1 })).toEqual(['jobs', 'creator', 8, { page: 1 }])
    expect(queryKeys.adminStats).toEqual(['admin', 'stats'])
  })
})
