import { apiClient } from '../client'
import type { ApiResponse, Hire } from '@/shared/schemas'
import { normalizeHire, normalizeHiresResponse } from '../normalizers'

export const hiresApi = {
  all: async () =>
    normalizeHiresResponse(
      (await apiClient.get<ApiResponse<Hire[]>>("/api/hires")).data,
    ),
  mine: async () =>
    normalizeHiresResponse(
      (await apiClient.get<ApiResponse<Hire[]>>("/api/hires/my-hires"))
        .data,
    ),
  create: async (data: { jobId: number }) => {
    const response = (
      await apiClient.post<ApiResponse<Hire>>("/api/hires", {
        jobId: data.jobId,
      })
    ).data
    return response.content
      ? { ...response, content: normalizeHire(response.content) }
      : response
  },
  complete: async (id: number) => {
    const response = (
      await apiClient.post<ApiResponse<Hire>>(`/api/hires/complete/${id}`)
    ).data
    return response.content
      ? { ...response, content: normalizeHire(response.content) }
      : response
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/hires/${id}`)).data,
}
