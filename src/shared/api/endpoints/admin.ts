/**
 * Defines the admin API call that loads platform totals (users, jobs, contracts, and comments) for the admin dashboard.
 *
 * Calls: apiClient; GET /api/admin/stats
 * Used by:
 *   - shared/api/endpoints.ts
 */

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
