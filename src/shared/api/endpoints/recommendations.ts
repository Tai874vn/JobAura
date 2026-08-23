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
  quota: async () =>
    (
      await apiClient.get<ApiResponse<RecommendationQuota>>(
        "/api/recommendations/quota",
      )
    ).data,
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
