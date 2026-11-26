import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contractKeys, queryKeys } from '@/shared/api/query-keys'
import type { ContractDetail } from '@/shared/schemas'

const { refreshServicePageAfterReview } = vi.hoisted(() => ({
  refreshServicePageAfterReview: vi.fn(),
}))

vi.mock('../../utils/refresh-service-page', () => ({ refreshServicePageAfterReview }))

import { handleReviewSuccess } from '../use-contract-actions'

beforeEach(() => {
  refreshServicePageAfterReview.mockReset()
  refreshServicePageAfterReview.mockResolvedValue(undefined)
})

describe('handleReviewSuccess', () => {
  it('updates the contract cache, invalidates contracts, comments, and jobs, and revalidates server pages', () => {
    const queryClient = new QueryClient()
    const detailKey = contractKeys.contract(14, 1)
    queryClient.setQueryData<ContractDetail>(detailKey, {
      id: 14,
      canReview: true,
      review: null,
    } as ContractDetail)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    handleReviewSuccess({
      queryClient,
      detailKey,
      contractId: 14,
      input: { rating: 5, content: 'Great work' },
    })

    expect(queryClient.getQueryData<ContractDetail>(detailKey)).toMatchObject({
      canReview: false,
      review: { id: 0, rating: 5, content: 'Great work' },
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contracts'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.comments })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['jobs'] })
    expect(refreshServicePageAfterReview).toHaveBeenCalledWith(14)
  })
})
