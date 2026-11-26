import { apiClient } from '../client'
import type { ApiResponse } from '@/shared/schemas'

export const adminApi = {
  // Backend: GET /api/admin/stats → NestjsBE/src/modules/admin/services/admin.service.ts getStats()
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
