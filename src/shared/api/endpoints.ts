import { apiClient, uploadClient } from "./client";
import type {
  ApiResponse,
  AppNotification,
  CandidateDirectoryParams,
  CandidateProfile,
  ChatMessage,
  ChatRoom,
  Comment,
  CreateComment,
  ApplyHiringPost,
  CreateHiringPost,
  CreateJob,
  HiredJob,
  HiringApplication,
  HiringPost,
  FeedPage,
  FeedPost,
  FeedStats,
  Connection,
  ConnectionRequests,
  ConnectionStatus,
  ConnectionSuggestion,
  CursorPage,
  PostComment,
  ImportResume,
  Job,
  JobDetailType,
  JobSearchParams,
  JobType,
  NotificationPage,
  PaginatedContent,
  PaginationParams,
  ProfileCertification,
  ProfilePortfolioItem,
  ProfileSkill,
  RecommendationContent,
  RecommendationQuota,
  RecommendedCandidate,
  RecommendedJob,
  SignIn,
  SignUp,
  UpdateProfile,
  UpdateJob,
  User,
  UserProfile,
  UserResume,
} from "@/shared/schemas";
import {
  normalizeCategoriesResponse,
  normalizeComment,
  normalizeCommentsResponse,
  normalizeHiredJob,
  normalizeHiredJobsResponse,
  normalizeFeedPost,
  normalizeFeedResponse,
  normalizeNotification,
  normalizeNotificationsResponse,
  normalizePostComment,
  normalizeConnectionRequestsResponse,
  normalizeConnectionsResponse,
  normalizeConnectionSuggestionsResponse,
  normalizeCursorJobsResponse,
  normalizeSavedJobsResponse,
  normalizeHiringApplication,
  normalizeHiringPost,
  normalizePaginatedHiringApplicationsResponse,
  normalizePaginatedHiringPostsResponse,
  normalizeJob,
  normalizeJobResponse,
  normalizeJobsResponse,
  normalizePaginatedJobsResponse,
  normalizePaginatedCandidatesResponse,
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

type NotificationParams = {
  cursor?: string;
  limit?: number;
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

export const authApi = {
  signIn: async (data: SignIn) =>
    (
      await apiClient.post<ApiResponse<{ user: UserProfile }>>(
        "/api/auth/signin",
        data,
      )
    ).data,
  signUp: async (data: SignUp) =>
    (
      await apiClient.post<ApiResponse<{ user: UserProfile }>>(
        "/api/auth/signup",
        data,
      )
    ).data,
  me: async () =>
    (await apiClient.get<ApiResponse<UserProfile>>("/api/auth/me")).data,
  refresh: async () =>
    (await apiClient.post<ApiResponse<void>>("/api/auth/refresh")).data,
  logout: async () =>
    (await apiClient.post<ApiResponse<void>>("/api/auth/logout")).data,
};

export const notificationsApi = {
  list: async (params: NotificationParams = {}) =>
    normalizeNotificationsResponse(
      (
        await apiClient.get<ApiResponse<NotificationPage>>(
          "/api/notifications",
          { params },
        )
      ).data,
    ),
  unreadCount: async () =>
    (
      await apiClient.get<ApiResponse<{ unreadCount: number }>>(
        "/api/notifications/unread-count",
      )
    ).data,
  markRead: async (id: number) => {
    const response = (
      await apiClient.patch<ApiResponse<AppNotification>>(
        `/api/notifications/${id}/read`,
      )
    ).data;
    return response.content
      ? { ...response, content: normalizeNotification(response.content) }
      : response;
  },
  markAllRead: async () =>
    (
      await apiClient.patch<ApiResponse<{ unreadCount: number }>>(
        "/api/notifications/read-all",
      )
    ).data,
};

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

export const postsApi = {
  feed: async ({
    cursor,
    limit = 10,
  }: { cursor?: string; limit?: number } = {}) =>
    normalizeFeedResponse(
      (
        await apiClient.get<ApiResponse<FeedPage>>("/api/posts/feed", {
          params: { cursor, limit },
        })
      ).data,
    ),
  stats: async () =>
    (await apiClient.get<ApiResponse<FeedStats>>("/api/posts/me/stats")).data,
  create: async (content: string, image?: File) => {
    if (image) assertValidImageFile(image, { label: "Post image" });
    const formData = new FormData();
    if (content.trim()) formData.append("content", content.trim());
    if (image) formData.append("image", image);
    const response = (
      await uploadClient.post<ApiResponse<FeedPost>>("/api/posts", formData)
    ).data;
    return response.content
      ? { ...response, content: normalizeFeedPost(response.content) }
      : response;
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/posts/${id}`)).data,
  like: async (id: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/posts/${id}/like`)).data,
  unlike: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/posts/${id}/like`)).data,
  comments: async (postId: number, cursor?: number, limit = 5) => {
    const response = (
      await apiClient.get<
        ApiResponse<{ data: PostComment[]; nextCursor: number | null }>
      >(`/api/posts/${postId}/comments`, { params: { cursor, limit } })
    ).data;
    return response.content
      ? {
          ...response,
          content: {
            data: response.content.data.map(normalizePostComment),
            nextCursor: response.content.nextCursor,
          },
        }
      : response;
  },
  createComment: async (postId: number, content: string) => {
    const response = (
      await apiClient.post<ApiResponse<PostComment>>(
        `/api/posts/${postId}/comments`,
        { content },
      )
    ).data;
    return response.content
      ? { ...response, content: normalizePostComment(response.content) }
      : response;
  },
  updateComment: async (postId: number, commentId: number, content: string) => {
    const response = (
      await apiClient.put<ApiResponse<PostComment>>(
        `/api/posts/${postId}/comments/${commentId}`,
        { content },
      )
    ).data;
    return response.content
      ? { ...response, content: normalizePostComment(response.content) }
      : response;
  },
  deleteComment: async (postId: number, commentId: number) =>
    (
      await apiClient.delete<ApiResponse<void>>(
        `/api/posts/${postId}/comments/${commentId}`,
      )
    ).data,
};

export const savedItemsApi = {
  posts: async (cursor?: string, limit = 10) =>
    normalizeFeedResponse(
      (
        await apiClient.get<ApiResponse<FeedPage>>("/api/saved/posts", {
          params: { cursor, limit },
        })
      ).data,
    ),
  savePost: async (postId: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/saved/posts/${postId}`)).data,
  unsavePost: async (postId: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/saved/posts/${postId}`))
      .data,
  jobs: async (cursor?: string, limit = 12) =>
    normalizeSavedJobsResponse(
      (
        await apiClient.get<ApiResponse<CursorPage<Job>>>("/api/saved/jobs", {
          params: { cursor, limit },
        })
      ).data,
    ),
  saveJob: async (jobId: number) =>
    (await apiClient.put<ApiResponse<void>>(`/api/saved/jobs/${jobId}`)).data,
  unsaveJob: async (jobId: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/saved/jobs/${jobId}`))
      .data,
};

type ConnectionsParams = { page?: number; pageSize?: number; keyword?: string };

export const connectionsApi = {
  all: async (params: ConnectionsParams = {}) =>
    normalizeConnectionsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<Connection>>>(
          "/api/connections",
          { params },
        )
      ).data,
    ),
  requests: async () =>
    normalizeConnectionRequestsResponse(
      (
        await apiClient.get<ApiResponse<ConnectionRequests>>(
          "/api/connections/requests",
        )
      ).data,
    ),
  suggestions: async (params: ConnectionsParams = {}) =>
    normalizeConnectionSuggestionsResponse(
      (
        await apiClient.get<
          ApiResponse<PaginatedContent<ConnectionSuggestion>>
        >("/api/connections/suggestions", { params })
      ).data,
    ),
  status: async (userId: number) =>
    (
      await apiClient.get<ApiResponse<ConnectionStatus>>(
        `/api/connections/status/${userId}`,
      )
    ).data,
  send: async (userId: number) =>
    (
      await apiClient.post<ApiResponse<Connection>>(
        `/api/connections/requests/${userId}`,
      )
    ).data,
  accept: async (connectionId: number) =>
    (
      await apiClient.put<ApiResponse<Connection>>(
        `/api/connections/requests/${connectionId}/accept`,
      )
    ).data,
  remove: async (connectionId: number) =>
    (
      await apiClient.delete<ApiResponse<void>>(
        `/api/connections/${connectionId}`,
      )
    ).data,
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

export const usersApi = {
  all: async () =>
    (await apiClient.get<ApiResponse<User[]>>("/api/users")).data,
  candidates: async (params: CandidateDirectoryParams) =>
    normalizePaginatedCandidatesResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<CandidateProfile>>>(
          "/api/users/candidates",
          { params },
        )
      ).data,
    ),
  profile: async (id: number) =>
    (await apiClient.get<ApiResponse<UserProfile>>(`/api/users/profile/${id}`))
      .data,
  myProfile: async () =>
    (await apiClient.get<ApiResponse<UserProfile>>("/api/users/me/profile"))
      .data,
  myResume: async () =>
    (
      await apiClient.get<ApiResponse<UserResume | null>>(
        "/api/users/me/resume",
      )
    ).data,
  importResume: async (data: ImportResume) =>
    (await apiClient.put<ApiResponse<UserResume>>("/api/users/me/resume", data))
      .data,
  predictResumeSeniority: async () =>
    (
      await apiClient.post<ApiResponse<UserResume>>(
        "/api/users/me/resume/seniority",
      )
    ).data,
  uploadResumeFile: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return (
      await uploadClient.post<ApiResponse<UserResume>>(
        "/api/users/me/resume/file",
        formData,
      )
    ).data;
  },
  updateMyProfile: async (data: UpdateProfile) =>
    (
      await apiClient.patch<ApiResponse<UserProfile>>(
        "/api/users/me/profile",
        data,
      )
    ).data,
  replaceSkills: async (skills: Array<Omit<ProfileSkill, "id">>) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>(
        "/api/users/me/profile/skills",
        { skills },
      )
    ).data,
  replaceCertifications: async (
    certifications: Array<Omit<ProfileCertification, "id">>,
  ) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>(
        "/api/users/me/profile/certifications",
        { certifications },
      )
    ).data,
  createPortfolioItem: async (data: Omit<ProfilePortfolioItem, "id">) =>
    (
      await apiClient.post<ApiResponse<UserProfile>>(
        "/api/users/me/profile/portfolio",
        data,
      )
    ).data,
  updatePortfolioItem: async (
    id: number,
    data: Partial<Omit<ProfilePortfolioItem, "id">>,
  ) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>(
        `/api/users/me/profile/portfolio/${id}`,
        data,
      )
    ).data,
  deletePortfolioItem: async (id: number) =>
    (
      await apiClient.delete<ApiResponse<void>>(
        `/api/users/me/profile/portfolio/${id}`,
      )
    ).data,
  update: async (id: number, data: Partial<User>) =>
    (await apiClient.put<ApiResponse<User>>(`/api/users/${id}`, data)).data,
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/users/${id}`)).data,
  uploadAvatar: async (file: File) => {
    assertValidImageFile(file, { label: "Avatar" });
    const formData = new FormData();
    formData.append("file", file);
    return (
      await uploadClient.post<ApiResponse<UserProfile>>(
        "/api/users/upload-avatar",
        formData,
      )
    ).data;
  },
  uploadCover: async (file: File) => {
    assertValidImageFile(file, { label: "Cover image" });
    const formData = new FormData();
    formData.append("file", file);
    return (
      await uploadClient.post<ApiResponse<UserProfile>>(
        "/api/users/upload-cover",
        formData,
      )
    ).data;
  },
};

export const skillsApi = {
  all: async () =>
    (await apiClient.get<ApiResponse<string[]>>("/api/skill")).data,
};

export const chatApi = {
  rooms: async () =>
    (await apiClient.get<ApiResponse<ChatRoom[]>>("/api/chat/rooms")).data,
  room: async (id: number) =>
    (await apiClient.get<ApiResponse<ChatRoom>>(`/api/chat/rooms/${id}`)).data,
  messages: async (roomId: number) =>
    (
      await apiClient.get<ApiResponse<ChatMessage[]>>(
        `/api/chat/rooms/${roomId}/messages`,
      )
    ).data,
  start: async (userId: number) =>
    (await apiClient.get<ApiResponse<ChatRoom>>(`/api/chat/start/${userId}`))
      .data,
  createRoom: async (data: { name?: string; memberIds: number[] }) =>
    (await apiClient.post<ApiResponse<ChatRoom>>("/api/chat/rooms", data)).data,
};

export const adminApi = {
  stats: async () =>
    (
      await apiClient.get<
        ApiResponse<{
          users: number;
          jobs: number;
          hires: number;
          comments: number;
        }>
      >("/api/admin/stats")
    ).data,
};
