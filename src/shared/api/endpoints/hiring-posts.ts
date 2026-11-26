import { apiClient } from '../client'
import type { ApiResponse, ApplyHiringPost, CreateHiringPost, HiringApplication, HiringPost, PaginatedContent, PaginationParams } from '@/shared/schemas'
import { normalizeHiringApplication, normalizeHiringPost, normalizePaginatedHiringApplicationsResponse, normalizePaginatedHiringPostsResponse } from '../normalizers'
import { definedParams } from './params'

export const hiringPostSorts = ['newest', 'closing_soon', 'salary_high'] as const
export type HiringPostSort = (typeof hiringPostSorts)[number]

/**
 * Filters a candidate uses on the hiring post list; the backend ignores empty ones. occupation, level and
 * employmentType take several values as "a,b" (any of them matches); different filters must all match.
 */
export type HiringPostFilters = PaginationParams & {
  /** ESCO occupation codes, comma-separated. */
  occupation?: string
  level?: string
  employmentType?: string
  location?: string
  /** Newest first when left out. */
  sort?: HiringPostSort
}

/** How many open posts a value finds. */
export type FacetCount = { value: string; count: number }
/** What each filter choice would find, given the other filters. */
export type HiringPostFacets = {
  occupations: { code: string; title: string; count: number }[]
  levels: FacetCount[]
  employmentTypes: FacetCount[]
  locations: FacetCount[]
}

export const hiringPostsApi = {
  /** Locations of open posts with how many each finds; counts can overlap ("Da Nang" also finds "Da Nang, Vietnam"). */
  // @find [all] hiring-posts / filters / location / api — GET /api/hiring-posts/locations
  locations: async () =>
    (await apiClient.get<ApiResponse<FacetCount[]>>("/api/hiring-posts/locations")).data,
  // @find [all] hiring-posts / filters / counts / api — GET /api/hiring-posts/facets
  facets: async (params: Omit<HiringPostFilters, 'page' | 'pageSize' | 'sort'>) =>
    (await apiClient.get<ApiResponse<HiringPostFacets>>("/api/hiring-posts/facets", { params: definedParams(params) })).data,
  // @find [all] hiring-posts / results / list / api — GET /api/hiring-posts
  open: async (params: HiringPostFilters) =>
    normalizePaginatedHiringPostsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringPost>>>(
          "/api/hiring-posts",
          { params: definedParams(params) },
        )
      ).data,
    ),
  // @find [all] hiring-post-detail / page / post / api — GET /api/hiring-posts/:id
  one: async (id: number) => {
    const response = (await apiClient.get<ApiResponse<HiringPost>>(`/api/hiring-posts/${id}`)).data
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response
  },
  // @find [recruiter] my-hiring-posts / results / list / api — GET /api/hiring-posts/mine
  mine: async (params: PaginationParams) =>
    normalizePaginatedHiringPostsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringPost>>>(
          "/api/hiring-posts/mine",
          { params: definedParams(params) },
        )
      ).data,
    ),
  // @find [recruiter] my-hiring-posts / form / create / api — POST /api/hiring-posts
  create: async (data: CreateHiringPost) => {
    const response = (
      await apiClient.post<ApiResponse<HiringPost>>("/api/hiring-posts", data)
    ).data
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response
  },
  // @find [owner] my-hiring-posts / form / update / api — PATCH /api/hiring-posts/:id (also close and reopen)
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
  // @find [owner] my-hiring-posts / card / delete / api — DELETE /api/hiring-posts/:id
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/hiring-posts/${id}`)).data,
  // @find [owner] my-hiring-posts / form / seniority / api — POST /api/hiring-posts/:id/seniority
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
