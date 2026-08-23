import { apiClient } from '../client'
import type { ApiResponse, Comment, CreateComment } from '@/shared/schemas'
import { normalizeComment, normalizeCommentsResponse, toCommentPayload } from '../normalizers'

export const commentsApi = {
  all: async () =>
    normalizeCommentsResponse(
      (await apiClient.get<ApiResponse<Comment[]>>("/api/comments")).data,
    ),
  create: async (data: CreateComment) => {
    const response = (
      await apiClient.post<ApiResponse<Comment>>(
        "/api/comments",
        toCommentPayload(data),
      )
    ).data
    return response.content
      ? { ...response, content: normalizeComment(response.content) }
      : response
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/comments/${id}`)).data,
}
