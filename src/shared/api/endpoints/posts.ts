import { apiClient, uploadClient } from '../client'
import { normalizeFeedPost, normalizeFeedResponse, normalizePostComment } from '../normalizers'
import { assertValidImageFile } from '@/shared/lib/file-validation'
import type { ApiResponse, FeedPage, FeedPost, FeedStats, PostComment } from '@/shared/schemas'

export const postsApi = {
  feed: async ({ cursor, limit = 10 }: { cursor?: string; limit?: number } = {}) =>
    normalizeFeedResponse(
      (
        await apiClient.get<ApiResponse<FeedPage>>('/api/posts/feed', {
          params: { cursor, limit },
        })
      ).data,
    ),
  stats: async () =>
    (await apiClient.get<ApiResponse<FeedStats>>('/api/posts/me/stats')).data,
  create: async (content: string, image?: File) => {
    if (image) assertValidImageFile(image, { label: 'Post image' })
    const formData = new FormData()
    if (content.trim()) formData.append('content', content.trim())
    if (image) formData.append('image', image)
    const response = (
      await uploadClient.post<ApiResponse<FeedPost>>('/api/posts', formData)
    ).data
    return response.content
      ? { ...response, content: normalizeFeedPost(response.content) }
      : response
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/posts/${id}`)).data,
  like: async (id: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/posts/${id}/like`)).data,
  unlike: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/posts/${id}/like`)).data,
  comments: async (postId: number, cursor?: number, limit = 5) => {
    const response = (
      await apiClient.get<ApiResponse<{ data: PostComment[]; nextCursor: number | null }>>(
        `/api/posts/${postId}/comments`,
        { params: { cursor, limit } },
      )
    ).data
    return response.content
      ? {
          ...response,
          content: {
            data: response.content.data.map(normalizePostComment),
            nextCursor: response.content.nextCursor,
          },
        }
      : response
  },
  createComment: async (postId: number, content: string) => {
    const response = (
      await apiClient.post<ApiResponse<PostComment>>(`/api/posts/${postId}/comments`, { content })
    ).data
    return response.content
      ? { ...response, content: normalizePostComment(response.content) }
      : response
  },
  updateComment: async (postId: number, commentId: number, content: string) => {
    const response = (
      await apiClient.put<ApiResponse<PostComment>>(
        `/api/posts/${postId}/comments/${commentId}`,
        { content },
      )
    ).data
    return response.content
      ? { ...response, content: normalizePostComment(response.content) }
      : response
  },
  deleteComment: async (postId: number, commentId: number) =>
    (
      await apiClient.delete<ApiResponse<void>>(
        `/api/posts/${postId}/comments/${commentId}`,
      )
    ).data,
}
