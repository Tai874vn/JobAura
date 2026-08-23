import { apiClient } from '../client'
import type { ApiResponse, HiredJob } from '@/shared/schemas'
import { normalizeHiredJob, normalizeHiredJobsResponse } from '../normalizers'

export const hiredJobsApi = {
  all: async () =>
    normalizeHiredJobsResponse(
      (await apiClient.get<ApiResponse<HiredJob[]>>("/api/hires")).data,
    ),
  mine: async () =>
    normalizeHiredJobsResponse(
      (await apiClient.get<ApiResponse<HiredJob[]>>("/api/hires/my-hires"))
        .data,
    ),
  create: async (data: { maCongViec: number }) => {
    const response = (
      await apiClient.post<ApiResponse<HiredJob>>("/api/hires", {
        jobId: data.maCongViec,
      })
    ).data
    return response.content
      ? { ...response, content: normalizeHiredJob(response.content) }
      : response
  },
  complete: async (id: number) => {
    const response = (
      await apiClient.post<ApiResponse<HiredJob>>(`/api/hires/complete/${id}`)
    ).data
    return response.content
      ? { ...response, content: normalizeHiredJob(response.content) }
      : response
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/hires/${id}`)).data,
}
