/**
 * Defines API calls for AI job recommendations, candidate recommendations for a hiring post, and the user's recommendation quota.
 *
 * Calls: apiClient; GET /api/recommendations/quota; POST /api/recommendations/jobs; POST /api/recommendations/hiring-posts/:hiringPostId/candidates; normalizeRecommendedJobsResponse; normalizeRecommendedCandidatesResponse
 * Used by:
 *   - shared/api/endpoints.ts
 */

import { apiClient } from '../client'
import type { ApiResponse, RecommendationContent, RecommendationQuota, RecommendedCandidate, RecommendedJob } from '@/shared/schemas'
import { normalizeRecommendedCandidatesResponse, normalizeRecommendedJobsResponse } from '../normalizers'

export type RecommendationParams = {
  topK?: number
  poolSize?: number
  cacheOnly?: boolean
  forceRefresh?: boolean
}

export const recommendationsApi = {
  // Backend: GET /api/recommendations/quota → NestjsBE/src/modules/recommendations/services/recommendations.service.ts getQuotaForUser()
  quota: async () =>
    (
      await apiClient.get<ApiResponse<RecommendationQuota>>(
        "/api/recommendations/quota",
      )
    ).data,
  // Backend: GET /api/recommendations/jobs → NestjsBE/src/modules/recommendations/services/recommendations.service.ts recommendJobsForUser()
  // Backend: POST /api/recommendations/jobs → NestjsBE/src/modules/recommendations/services/recommendations.service.ts recommendJobsForUser()
  jobs: async (params?: RecommendationParams) =>
    normalizeRecommendedJobsResponse(
      (
        await (params?.cacheOnly
          ? apiClient.get<ApiResponse<RecommendationContent<RecommendedJob>>>(
              "/api/recommendations/jobs",
              { params },
            )
          : apiClient.post<ApiResponse<RecommendationContent<RecommendedJob>>>(
              "/api/recommendations/jobs",
              undefined,
              { params },
            ))
      ).data,
    ),
  // Backend: GET /api/recommendations/hiring-posts/:hiringPostId/candidates → NestjsBE/src/modules/recommendations/services/recommendations.service.ts recommendCandidatesForHiringPost()
  // Backend: POST /api/recommendations/hiring-posts/:hiringPostId/candidates → NestjsBE/src/modules/recommendations/services/recommendations.service.ts recommendCandidatesForHiringPost()
  candidates: async (hiringPostId: number, params?: RecommendationParams) =>
    normalizeRecommendedCandidatesResponse(
      (
        await (params?.cacheOnly
          ? apiClient.get<
              ApiResponse<RecommendationContent<RecommendedCandidate>>
            >(`/api/recommendations/hiring-posts/${hiringPostId}/candidates`, {
              params,
            })
          : apiClient.post<
              ApiResponse<RecommendationContent<RecommendedCandidate>>
            >(
              `/api/recommendations/hiring-posts/${hiringPostId}/candidates`,
              undefined,
              { params },
            ))
      ).data,
    ),
}
