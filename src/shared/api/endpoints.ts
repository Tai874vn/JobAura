export { adminApi } from './endpoints/admin'
export { authApi } from './endpoints/auth'
export { chatApi } from './endpoints/chat'
export { connectionsApi } from './endpoints/connections'
export { notificationsApi } from './endpoints/notifications'
export { postsApi } from './endpoints/posts'
export { savedItemsApi } from './endpoints/saved-items'
export { skillsApi, usersApi } from './endpoints/users'

import { apiClient, uploadClient } from "./client";
import type {
  ApiResponse,
  Comment,
  CreateComment,
  ApplyHiringPost,
  CreateHiringPost,
  CreateJob,
  HiredJob,
  HiringApplication,
  HiringPost,
  CursorPage,
  Job,
  JobDetailType,
  JobSearchParams,
  JobType,
  PaginatedContent,
  PaginationParams,
  RecommendationContent,
  RecommendationQuota,
  RecommendedCandidate,
  RecommendedJob,
  UpdateJob,
} from "@/shared/schemas";
import {
  normalizeCategoriesResponse,
  normalizeComment,
  normalizeCommentsResponse,
  normalizeHiredJob,
  normalizeHiredJobsResponse,
  normalizeCursorJobsResponse,
  normalizeHiringApplication,
  normalizeHiringPost,
  normalizePaginatedHiringApplicationsResponse,
  normalizePaginatedHiringPostsResponse,
  normalizeJob,
  normalizeJobResponse,
  normalizeJobsResponse,
  normalizePaginatedJobsResponse,
  normalizeRecommendedCandidatesResponse,
  normalizeRecommendedJobsResponse,
  normalizeSubcategoriesResponse,
  normalizeCategory,
  normalizeSubcategory,
  toCategoryPayload,
  toCommentPayload,
  toJobPayload,
  toSubcategoryPayload,
} from "./normalizers";
import { assertValidImageFile } from "@/shared/lib/file-validation";

type RecommendationParams = {
  topK?: number;
  poolSize?: number;
  cacheOnly?: boolean;
  forceRefresh?: boolean;
};

type JobCursorParams = {
  cursor?: string;
  limit?: number;
  keyword?: string;
};

function definedParams<T extends Record<string, unknown>>(
  params: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as Partial<T>;
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
    ).data;
    return response.content
      ? { ...response, content: normalizeJob(response.content) }
      : response;
  },
  update: async (id: number, data: UpdateJob) => {
    const response = (
      await apiClient.put<ApiResponse<Job>>(
        `/api/jobs/${id}`,
        toJobPayload(data),
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeJob(response.content) }
      : response;
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/jobs/${id}`)).data,
  uploadImage: async (jobId: number, file: File) => {
    assertValidImageFile(file, { label: "Service image" });
    const formData = new FormData();
    formData.append("file", file);
    const response = (
      await uploadClient.post<ApiResponse<Job>>(
        `/api/jobs/upload-image/${jobId}`,
        formData,
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeJob(response.content) }
      : response;
  },
  menu: async () =>
    (await apiClient.get<ApiResponse<unknown>>("/api/jobs/category-menu")).data,
};

export const recommendationsApi = {
  quota: async () =>
    (
      await apiClient.get<ApiResponse<RecommendationQuota>>(
        "/api/recommendations/quota",
      )
    ).data,
  jobs: async (params?: RecommendationParams) =>
    normalizeRecommendedJobsResponse(
      (
        await apiClient.get<ApiResponse<RecommendationContent<RecommendedJob>>>(
          "/api/recommendations/jobs",
          { params },
        )
      ).data,
    ),
  candidates: async (hiringPostId: number, params?: RecommendationParams) =>
    normalizeRecommendedCandidatesResponse(
      (
        await apiClient.get<
          ApiResponse<RecommendationContent<RecommendedCandidate>>
        >(`/api/recommendations/hiring-posts/${hiringPostId}/candidates`, {
          params,
        })
      ).data,
    ),
};

export const hiringPostsApi = {
  open: async (params: PaginationParams) =>
    normalizePaginatedHiringPostsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<HiringPost>>>(
          "/api/hiring-posts",
          { params: definedParams(params) },
        )
      ).data,
    ),
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
    ).data;
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response;
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
    ).data;
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response;
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/hiring-posts/${id}`)).data,
  predictSeniority: async (id: number) => {
    const response = (
      await apiClient.post<ApiResponse<HiringPost>>(
        `/api/hiring-posts/${id}/seniority`,
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeHiringPost(response.content) }
      : response;
  },
  apply: async (id: number, data: ApplyHiringPost = {}) => {
    const response = (
      await apiClient.post<ApiResponse<HiringApplication>>(
        `/api/hiring-posts/${id}/applications`,
        data,
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeHiringApplication(response.content) }
      : response;
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
};

export const jobTypesApi = {
  all: async () =>
    normalizeCategoriesResponse(
      (await apiClient.get<ApiResponse<JobType[]>>("/api/categories")).data,
    ),
  create: async (data: Pick<JobType, "tenLoaiCongViec">) => {
    const response = (
      await apiClient.post<ApiResponse<JobType>>(
        "/api/categories",
        toCategoryPayload(data),
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeCategory(response.content) }
      : response;
  },
  update: async (
    id: number,
    data: Partial<Pick<JobType, "tenLoaiCongViec">>,
  ) => {
    const response = (
      await apiClient.put<ApiResponse<JobType>>(
        `/api/categories/${id}`,
        toCategoryPayload(data),
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeCategory(response.content) }
      : response;
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/categories/${id}`)).data,
};

export const jobDetailTypesApi = {
  all: async () =>
    normalizeSubcategoriesResponse(
      (await apiClient.get<ApiResponse<JobDetailType[]>>("/api/subcategories"))
        .data,
    ),
  create: async (data: Partial<JobDetailType>) => {
    const response = (
      await apiClient.post<ApiResponse<JobDetailType>>(
        "/api/subcategories",
        toSubcategoryPayload(data),
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeSubcategory(response.content) }
      : response;
  },
  update: async (id: number, data: Partial<JobDetailType>) => {
    const response = (
      await apiClient.put<ApiResponse<JobDetailType>>(
        `/api/subcategories/${id}`,
        toSubcategoryPayload(data),
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeSubcategory(response.content) }
      : response;
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/subcategories/${id}`))
      .data,
};

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
    ).data;
    return response.content
      ? { ...response, content: normalizeComment(response.content) }
      : response;
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/comments/${id}`)).data,
};

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
    ).data;
    return response.content
      ? { ...response, content: normalizeHiredJob(response.content) }
      : response;
  },
  complete: async (id: number) => {
    const response = (
      await apiClient.post<ApiResponse<HiredJob>>(`/api/hires/complete/${id}`)
    ).data;
    return response.content
      ? { ...response, content: normalizeHiredJob(response.content) }
      : response;
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/hires/${id}`)).data,
};
