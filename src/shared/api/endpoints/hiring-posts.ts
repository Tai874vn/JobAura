import { apiClient } from '../client'
import type { ApiResponse, ApplyHiringPost, CreateHiringPost, HiringApplication, HiringPost, PaginatedContent, PaginationParams } from '@/shared/schemas'
import { normalizeHiringApplication, normalizeHiringPost, normalizePaginatedHiringApplicationsResponse, normalizePaginatedHiringPostsResponse } from '../normalizers'
import { definedParams } from './params'

/**
 * Sorts the backend accepts (HIRING_POST_SORTS in NestjsBE hiring-post-query.dto.ts). A ?sort= in the URL that is
 * not in this list is dropped, so a new sort must be added here, in the backend list, and in config/hiring-posts.ts.
 */
export const hiringPostSorts = ['newest', 'oldest', 'closing_soon', 'salary_high'] as const
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
  /** Which fields the keyword is searched in, comma-separated (all when left out). */
  searchIn?: string
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
  // @find hiring-posts filters location api [all] — GET /api/hiring-posts/locations
  // Backend: GET /api/hiring-posts/locations → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findLocations()
  locations: async () =>
    (await apiClient.get<ApiResponse<FacetCount[]>>("/api/hiring-posts/locations")).data,
  // @find hiring-posts filters counts api [all] — GET /api/hiring-posts/facets
  // Backend: GET /api/hiring-posts/facets → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findFacets()
  facets: async (params: Omit<HiringPostFilters, 'page' | 'pageSize' | 'sort'>) =>
    (await apiClient.get<ApiResponse<HiringPostFacets>>("/api/hiring-posts/facets", { params: definedParams(params) })).data,
  // @find hiring-posts results list api [all] — GET /api/hiring-posts
  // Backend: GET /api/hiring-posts → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findOpen()
  open: async (params: HiringPostFilters) =>
    normalizePaginatedHiringPostsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringPost>>>(
          "/api/hiring-posts",
          { params: definedParams(params) },
        )
      ).data,
    ),
  // @find hiring-post-detail page post api [all] — GET /api/hiring-posts/:id
  // Backend: GET /api/hiring-posts/:id → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findOne()
  one: async (id: number) => {
    const response = (await apiClient.get<ApiResponse<HiringPost>>(`/api/hiring-posts/${id}`)).data
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response
  },
  // @find my-hiring-posts results list api [recruiter] — GET /api/hiring-posts/mine
  // Backend: GET /api/hiring-posts/mine → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findMine()
  mine: async (params: PaginationParams) =>
    normalizePaginatedHiringPostsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringPost>>>(
          "/api/hiring-posts/mine",
          { params: definedParams(params) },
        )
      ).data,
    ),
  // @find my-hiring-posts form create api [recruiter] — POST /api/hiring-posts
  // Backend: POST /api/hiring-posts → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts create()
  create: async (data: CreateHiringPost) => {
    const response = (
      await apiClient.post<ApiResponse<HiringPost>>("/api/hiring-posts", data)
    ).data
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response
  },
  // @find my-hiring-posts form update api [owner] — PATCH /api/hiring-posts/:id (also close and reopen)
  // Backend: PATCH /api/hiring-posts/:id → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts update()
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
  // @find my-hiring-posts card delete api [owner] — DELETE /api/hiring-posts/:id
  // Backend: DELETE /api/hiring-posts/:id → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts remove()
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/hiring-posts/${id}`)).data,
  // @find my-hiring-posts form seniority api [owner] — POST /api/hiring-posts/:id/seniority
  // Backend: POST /api/hiring-posts/:id/seniority → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts predictSeniority()
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
  // Backend: POST /api/hiring-posts/:id/applications → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts apply()
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
  // Backend: GET /api/hiring-posts/:id/applications → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findApplicationsForPost()
  applications: async (id: number, params: PaginationParams) =>
    normalizePaginatedHiringApplicationsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringApplication>>>(
          `/api/hiring-posts/${id}/applications`,
          { params: definedParams(params) },
        )
      ).data,
    ),
  // Backend: GET /api/hiring-posts/applications/me → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findMyApplications()
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
