import { apiClient } from '../client'
import type { ApiResponse, Comment, CreateComment } from '@/shared/schemas'
import { normalizeComment, normalizeCommentsResponse, toCommentPayload } from '../normalizers'

export const commentsApi = {
  // Backend: GET /api/comments → NestjsBE/src/modules/comments/services/comments.service.ts findAll()
  all: async () =>
    normalizeCommentsResponse(
      (await apiClient.get<ApiResponse<Comment[]>>("/api/comments")).data,
    ),
  // Backend: POST /api/comments → NestjsBE/src/modules/comments/services/comments.service.ts create()
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
  // Backend: DELETE /api/comments/:id → NestjsBE/src/modules/comments/services/comments.service.ts remove()
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/comments/${id}`)).data,
}
