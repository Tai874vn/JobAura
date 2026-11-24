import { apiClient } from '../client'
import type { ApiResponse } from '@/shared/schemas'

export const adminApi = {
  stats: async () =>
    (
      await apiClient.get<ApiResponse<{
        users: number
        jobs: number
        contracts: number
        comments: number
      }>>('/api/admin/stats')
    ).data,
}
