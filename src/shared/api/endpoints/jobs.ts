/**
 * Defines API calls for freelance service listings (jobs): listing, cursor and paginated search, detail lookup, create, update, delete, category menu, and image upload.
 *
 * Calls: apiClient; uploadClient; definedParams; assertValidImageFile; GET /api/jobs/paginated-search; GET /api/jobs/details/:jobId; normalizeJob; normalizePaginatedJobsResponse
 * Used by:
 *   - shared/api/endpoints.ts
 */

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
  // Backend: GET /api/jobs → NestjsBE/src/modules/jobs/services/jobs.service.ts findAll()
  all: async () =>
    normalizeJobsResponse(
      (await apiClient.get<ApiResponse<Job[]>>("/api/jobs")).data,
    ),
  // Backend: GET /api/jobs/cursor → NestjsBE/src/modules/jobs/services/jobs.service.ts findAllWithCursor()
  cursor: async (params?: JobCursorParams) =>
    normalizeCursorJobsResponse(
      (
        await apiClient.get<ApiResponse<CursorPage<Job>>>("/api/jobs/cursor", {
          params: params ? definedParams(params) : undefined,
        })
      ).data,
    ),
  // Backend: GET /api/jobs/paginated-search → NestjsBE/src/modules/jobs/services/jobs.service.ts findAllWithPagination()
  paginated: async (params: JobSearchParams) =>
    normalizePaginatedJobsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<Job>>>(
          "/api/jobs/paginated-search",
          { params: definedParams(params) },
        )
      ).data,
    ),
  // Backend: GET /api/jobs/by-creator/:creatorId → NestjsBE/src/modules/jobs/services/jobs.service.ts findByCreator()
  byCreator: async (creatorId: number, params: PaginationParams) =>
    normalizePaginatedJobsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<Job>>>(
          `/api/jobs/by-creator/${creatorId}`,
          { params },
        )
      ).data,
    ),
  // Backend: GET /api/jobs/details/:jobId → NestjsBE/src/modules/jobs/services/jobs.service.ts getJobDetails()
  detail: async (id: number) =>
    normalizeJobResponse(
      (
        await apiClient.get<ApiResponse<Job & { binhLuans?: Comment[] }>>(
          `/api/jobs/details/${id}`,
        )
      ).data,
    ),
  // Backend: GET /api/jobs/search/:name → NestjsBE/src/modules/jobs/services/jobs.service.ts searchByName()
  byName: async (name: string) =>
    normalizeJobsResponse(
      (await apiClient.get<ApiResponse<Job[]>>(`/api/jobs/search/${name}`))
        .data,
    ),
  // Backend: POST /api/jobs → NestjsBE/src/modules/jobs/services/jobs.service.ts create()
  create: async (data: CreateJob) => {
    const response = (
      await apiClient.post<ApiResponse<Job>>("/api/jobs", toJobPayload(data))
    ).data
    return response.content
      ? { ...response, content: normalizeJob(response.content) }
      : response
  },
  // Backend: PUT /api/jobs/:id → NestjsBE/src/modules/jobs/services/jobs.service.ts update()
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
  // Backend: DELETE /api/jobs/:id → NestjsBE/src/modules/jobs/services/jobs.service.ts remove()
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/jobs/${id}`)).data,
  // Backend: POST /api/jobs/upload-image/:jobId → NestjsBE/src/modules/jobs/services/jobs.service.ts uploadImage()
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
  // Backend: GET /api/jobs/category-menu → NestjsBE/src/modules/jobs/services/jobs.service.ts getCategoryMenu()
  menu: async () =>
    (await apiClient.get<ApiResponse<unknown>>("/api/jobs/category-menu")).data,
}
