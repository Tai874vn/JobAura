/**
 * Defines API calls to list, save, and unsave feed posts and freelance service jobs for the signed-in user.
 *
 * Calls: apiClient; GET /api/saved/posts; PUT /api/saved/posts/:postId; GET /api/saved/jobs; PUT /api/saved/jobs/:jobId; normalizeFeedResponse; normalizeSavedJobsResponse
 * Used by:
 *   - shared/api/endpoints.ts
 */

import { apiClient } from '../client'
import { normalizeFeedResponse, normalizeSavedJobsResponse } from '../normalizers'
import type { ApiResponse, CursorPage, FeedPage, Job } from '@/shared/schemas'

export const savedItemsApi = {
  // Backend: GET /api/saved/posts → NestjsBE/src/modules/saved-items/services/saved-items.service.ts getSavedPosts()
  posts: async (cursor?: string, limit = 10) =>
    normalizeFeedResponse(
      (
        await apiClient.get<ApiResponse<FeedPage>>('/api/saved/posts', {
          params: { cursor, limit },
        })
      ).data,
    ),
  // Backend: PUT /api/saved/posts/:postId → NestjsBE/src/modules/saved-items/services/saved-items.service.ts savePost()
  savePost: async (postId: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/saved/posts/${postId}`)).data,
  // Backend: DELETE /api/saved/posts/:postId → NestjsBE/src/modules/saved-items/services/saved-items.service.ts unsavePost()
  unsavePost: async (postId: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/saved/posts/${postId}`)).data,
  // Backend: GET /api/saved/jobs → NestjsBE/src/modules/saved-items/services/saved-items.service.ts getSavedJobs()
  jobs: async (cursor?: string, limit = 12) =>
    normalizeSavedJobsResponse(
      (
        await apiClient.get<ApiResponse<CursorPage<Job>>>('/api/saved/jobs', {
          params: { cursor, limit },
        })
      ).data,
    ),
  // Backend: PUT /api/saved/jobs/:jobId → NestjsBE/src/modules/saved-items/services/saved-items.service.ts saveJob()
  saveJob: async (jobId: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/saved/jobs/${jobId}`)).data,
  // Backend: DELETE /api/saved/jobs/:jobId → NestjsBE/src/modules/saved-items/services/saved-items.service.ts unsaveJob()
  unsaveJob: async (jobId: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/saved/jobs/${jobId}`)).data,
}
