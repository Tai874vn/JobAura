import { apiClient, uploadClient } from '../client'
import { assertValidImageFile } from '@/shared/lib/file-validation'
import type { ApiResponse, Comment, CreateJob, CursorPage, Job, JobSearchParams, PaginatedContent, PaginationParams, UpdateJob } from '@/shared/schemas'
import { normalizeCursorJobsResponse, normalizeJob, normalizeJobResponse, normalizeJobsResponse, normalizePaginatedJobsResponse, toJobPayload } from '../normalizers'
import { definedParams } from './params'

type JobCursorParams = {
  cursor?: string
  limit?: number
  keyword?: string
}

export const jobsApi = {
  all: async () =>
    normalizeJobsResponse(
      (await apiClient.get<ApiResponse<Job[]>>("/api/jobs")).data,
    ),
  cursor: async (params?: JobCursorParams) =>
    normalizeCursorJobsResponse(
      (
        await apiClient.get<ApiResponse<CursorPage<Job>>>("/api/jobs/cursor", {
          params: params ? definedParams(params) : undefined,
        })
      ).data,
    ),
  paginated: async (params: JobSearchParams) =>
    normalizePaginatedJobsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<Job>>>(
          "/api/jobs/paginated-search",
          { params: definedParams(params) },
        )
      ).data,
    ),
  byCreator: async (creatorId: number, params: PaginationParams) =>
    normalizePaginatedJobsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<Job>>>(
          `/api/jobs/by-creator/${creatorId}`,
          { params },
        )
      ).data,
    ),
  detail: async (id: number) =>
    normalizeJobResponse(
      (
        await apiClient.get<ApiResponse<Job & { binhLuans?: Comment[] }>>(
          `/api/jobs/details/${id}`,
        )
      ).data,
    ),
  byName: async (name: string) =>
    normalizeJobsResponse(
      (await apiClient.get<ApiResponse<Job[]>>(`/api/jobs/search/${name}`))
        .data,
    ),
  create: async (data: CreateJob) => {
    const response = (
      await apiClient.post<ApiResponse<Job>>("/api/jobs", toJobPayload(data))
    ).data
    return response.content
      ? { ...response, content: normalizeJob(response.content) }
      : response
  },
  update: async (id: number, data: UpdateJob) => {
    const response = (
      await apiClient.put<ApiResponse<Job>>(
        `/api/jobs/${id}`,
        toJobPayload(data),
      )
    ).data
    return response.content
      ? { ...response, content: normalizeJob(response.content) }
      : response
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/jobs/${id}`)).data,
  uploadImage: async (jobId: number, file: File) => {
    assertValidImageFile(file, { label: "Service image" })
    const formData = new FormData()
    formData.append("file", file)
    const response = (
      await uploadClient.post<ApiResponse<Job>>(
        `/api/jobs/upload-image/${jobId}`,
        formData,
      )
    ).data
    return response.content
      ? { ...response, content: normalizeJob(response.content) }
      : response
  },
  menu: async () =>
    (await apiClient.get<ApiResponse<unknown>>("/api/jobs/category-menu")).data,
}
