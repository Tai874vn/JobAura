import { apiClient } from '../client'
import type { ApiResponse, ApplyHiringPost, CreateHiringPost, HiringApplication, HiringPost, PaginatedContent, PaginationParams } from '@/shared/schemas'
import { normalizeHiringApplication, normalizeHiringPost, normalizePaginatedHiringApplicationsResponse, normalizePaginatedHiringPostsResponse } from '../normalizers'
import { definedParams } from './params'

/** Filters a candidate uses on the hiring post list; the backend ignores empty ones. */
export type HiringPostFilters = PaginationParams & {
  /** ESCO occupation code. */
  occupation?: string
  level?: string
  employmentType?: string
  location?: string
}

export const hiringPostsApi = {
  open: async (params: HiringPostFilters) =>
    normalizePaginatedHiringPostsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringPost>>>(
          "/api/hiring-posts",
          { params: definedParams(params) },
        )
      ).data,
    ),
  one: async (id: number) => {
    const response = (await apiClient.get<ApiResponse<HiringPost>>(`/api/hiring-posts/${id}`)).data
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response
  },
  mine: async (params: PaginationParams) =>
    normalizePaginatedHiringPostsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringPost>>>(
          "/api/hiring-posts/mine",
          { params: definedParams(params) },
        )
      ).data,
    ),
  create: async (data: CreateHiringPost) => {
    const response = (
      await apiClient.post<ApiResponse<HiringPost>>("/api/hiring-posts", data)
    ).data
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response
  },
  update: async (
    id: number,
    data: Partial<CreateHiringPost> & { status?: HiringPost["status"] },
  ) => {
    const response = (
      await apiClient.patch<ApiResponse<HiringPost>>(
        `/api/hiring-posts/${id}`,
        data,
      )
    ).data
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/hiring-posts/${id}`)).data,
  predictSeniority: async (id: number) => {
    const response = (
      await apiClient.post<ApiResponse<HiringPost>>(
        `/api/hiring-posts/${id}/seniority`,
      )
    ).data
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response
  },
  apply: async (id: number, data: ApplyHiringPost = {}) => {
    const response = (
      await apiClient.post<ApiResponse<HiringApplication>>(
        `/api/hiring-posts/${id}/applications`,
        data,
      )
    ).data
    return response.content
      ? { ...response, content: normalizeHiringApplication(response.content) }
      : response
  },
  applications: async (id: number, params: PaginationParams) =>
    normalizePaginatedHiringApplicationsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringApplication>>>(
          `/api/hiring-posts/${id}/applications`,
          { params: definedParams(params) },
        )
      ).data,
    ),
  myApplications: async (params: PaginationParams) =>
    normalizePaginatedHiringApplicationsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringApplication>>>(
          "/api/hiring-posts/applications/me",
          { params: definedParams(params) },
        )
      ).data,
    ),
}
