import { apiClient, uploadClient } from '../client'
import { normalizeFeedPost, normalizeFeedResponse, normalizePostComment } from '../normalizers'
import { assertValidImageFile } from '@/shared/lib/file-validation'
import type { ApiResponse, FeedPage, FeedPost, FeedStats, PostComment } from '@/shared/schemas'
import { postCommentContentSchema } from '@/shared/schemas'

export const postsApi = {
  // Backend: GET /api/posts/feed → NestjsBE/src/modules/posts/services/posts.service.ts getFeed()
  feed: async ({ cursor, limit = 10 }: { cursor?: string; limit?: number } = {}) =>
    normalizeFeedResponse(
      (
        await apiClient.get<ApiResponse<FeedPage>>('/api/posts/feed', {
          params: { cursor, limit },
        })
      ).data,
    ),
  // Backend: GET /api/posts/me/stats → NestjsBE/src/modules/posts/services/posts.service.ts getMyStats()
  stats: async () =>
    (await apiClient.get<ApiResponse<FeedStats>>('/api/posts/me/stats')).data,
  // Backend: POST /api/posts → NestjsBE/src/modules/posts/services/posts.service.ts createPost()
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
  // Backend: DELETE /api/posts/:id → NestjsBE/src/modules/posts/services/posts.service.ts deletePost()
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/posts/${id}`)).data,
  // Backend: PUT /api/posts/:id/like → NestjsBE/src/modules/posts/services/posts.service.ts likePost()
  like: async (id: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/posts/${id}/like`)).data,
  // Backend: DELETE /api/posts/:id/like → NestjsBE/src/modules/posts/services/posts.service.ts unlikePost()
  unlike: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/posts/${id}/like`)).data,
  // Backend: GET /api/posts/:id/comments → NestjsBE/src/modules/posts/services/posts.service.ts getComments()
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
  // Backend: POST /api/posts/:id/comments → NestjsBE/src/modules/posts/services/posts.service.ts createComment()
  createComment: async (postId: number, content: string) => {
    const response = (
      await apiClient.post<ApiResponse<PostComment>>(`/api/posts/${postId}/comments`, { content: postCommentContentSchema.parse(content) })
    ).data
    return response.content
      ? { ...response, content: normalizePostComment(response.content) }
      : response
  },
  // Backend: GET /api/posts/:postId/comments/:commentId/replies → NestjsBE/src/modules/posts/services/posts.service.ts getReplies()
  replies: async (postId: number, commentId: number, cursor?: number, limit = 10) => {
    const response = (
      await apiClient.get<ApiResponse<{ data: PostComment[]; nextCursor: number | null }>>(
        `/api/posts/${postId}/comments/${commentId}/replies`,
        { params: { limit, cursor } },
      )
    ).data
    return response.content
      ? { ...response, content: { ...response.content, data: response.content.data.map(normalizePostComment) } }
      : response
  },
  // Backend: POST /api/posts/:postId/comments/:commentId/replies → NestjsBE/src/modules/posts/services/posts.service.ts createReply()
  createReply: async (postId: number, commentId: number, content: string) => {
    const response = (
      await apiClient.post<ApiResponse<PostComment>>(
        `/api/posts/${postId}/comments/${commentId}/replies`,
        { content: postCommentContentSchema.parse(content) },
      )
    ).data
    return response.content ? { ...response, content: normalizePostComment(response.content) } : response
  },
  // Backend: PUT /api/posts/:postId/comments/:commentId → NestjsBE/src/modules/posts/services/posts.service.ts updateComment()
  updateComment: async (postId: number, commentId: number, content: string) => {
    const response = (
      await apiClient.put<ApiResponse<PostComment>>(
        `/api/posts/${postId}/comments/${commentId}`,
        { content: postCommentContentSchema.parse(content) },
      )
    ).data
    return response.content
      ? { ...response, content: normalizePostComment(response.content) }
      : response
  },
  // Backend: DELETE /api/posts/:postId/comments/:commentId → NestjsBE/src/modules/posts/services/posts.service.ts deleteComment()
  deleteComment: async (postId: number, commentId: number) =>
    (
      await apiClient.delete<ApiResponse<void>>(
        `/api/posts/${postId}/comments/${commentId}`,
      )
    ).data,
}
