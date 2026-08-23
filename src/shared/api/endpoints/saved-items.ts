import { apiClient } from '../client'
import { normalizeFeedResponse, normalizeSavedJobsResponse } from '../normalizers'
import type { ApiResponse, CursorPage, FeedPage, Job } from '@/shared/schemas'

export const savedItemsApi = {
  posts: async (cursor?: string, limit = 10) =>
    normalizeFeedResponse(
      (
        await apiClient.get<ApiResponse<FeedPage>>('/api/saved/posts', {
          params: { cursor, limit },
        })
      ).data,
    ),
  savePost: async (postId: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/saved/posts/${postId}`)).data,
  unsavePost: async (postId: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/saved/posts/${postId}`)).data,
  jobs: async (cursor?: string, limit = 12) =>
    normalizeSavedJobsResponse(
      (
        await apiClient.get<ApiResponse<CursorPage<Job>>>('/api/saved/jobs', {
          params: { cursor, limit },
        })
      ).data,
    ),
  saveJob: async (jobId: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/saved/jobs/${jobId}`)).data,
  unsaveJob: async (jobId: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/saved/jobs/${jobId}`)).data,
}
