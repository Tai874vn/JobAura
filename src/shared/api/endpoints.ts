import { apiClient, uploadClient } from './client'
import type {
  ApiResponse,
  ChatMessage,
  ChatRoom,
  Comment,
  CreateComment,
  CreateJob,
  HiredJob,
  ImportResume,
  Job,
  JobDetailType,
  JobType,
  PaginatedContent,
  PaginationParams,
  ProfileCertification,
  ProfilePortfolioItem,
  ProfileSkill,
  RecommendationContent,
  RecommendedCandidate,
  RecommendedJob,
  SignIn,
  SignUp,
  UpdateProfile,
  UpdateJob,
  User,
  UserProfile,
  UserResume,
} from '@/shared/schemas'
import {
  normalizeCategoriesResponse,
  normalizeComment,
  normalizeCommentsResponse,
  normalizeHiredJob,
  normalizeHiredJobsResponse,
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
} from './normalizers'

type RecommendationParams = {
  topK?: number
  poolSize?: number
}

export const authApi = {
  signIn: async (data: SignIn) => (await apiClient.post<ApiResponse<{ user: UserProfile }>>('/api/auth/signin', data)).data,
  signUp: async (data: SignUp) => (await apiClient.post<ApiResponse<{ user: UserProfile }>>('/api/auth/signup', data)).data,
  me: async () => (await apiClient.get<ApiResponse<UserProfile>>('/api/auth/me')).data,
  refresh: async () => (await apiClient.post<ApiResponse<void>>('/api/auth/refresh')).data,
  logout: async () => (await apiClient.post<ApiResponse<void>>('/api/auth/logout')).data,
}

export const jobsApi = {
  all: async () => normalizeJobsResponse((await apiClient.get<ApiResponse<Job[]>>('/api/jobs')).data),
  paginated: async (params: PaginationParams) =>
    normalizePaginatedJobsResponse((await apiClient.get<ApiResponse<PaginatedContent<Job>>>('/api/jobs/paginated-search', { params })).data),
  detail: async (id: number) =>
    normalizeJobResponse((await apiClient.get<ApiResponse<Job & { binhLuans?: Comment[] }>>(`/api/jobs/details/${id}`)).data),
  byName: async (name: string) =>
    normalizeJobsResponse((await apiClient.get<ApiResponse<Job[]>>(`/api/jobs/search/${name}`)).data),
  create: async (data: CreateJob) => {
    const response = (await apiClient.post<ApiResponse<Job>>('/api/jobs', toJobPayload(data))).data
    return response.content ? { ...response, content: normalizeJob(response.content) } : response
  },
  update: async (id: number, data: UpdateJob) => {
    const response = (await apiClient.put<ApiResponse<Job>>(`/api/jobs/${id}`, toJobPayload(data))).data
    return response.content ? { ...response, content: normalizeJob(response.content) } : response
  },
  delete: async (id: number) => (await apiClient.delete<ApiResponse<void>>(`/api/jobs/${id}`)).data,
  uploadImage: async (jobId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = (await uploadClient.post<ApiResponse<Job>>(`/api/jobs/upload-image/${jobId}`, formData)).data
    return response.content ? { ...response, content: normalizeJob(response.content) } : response
  },
  menu: async () => (await apiClient.get<ApiResponse<unknown>>('/api/jobs/category-menu')).data,
}

export const recommendationsApi = {
  jobs: async (params?: RecommendationParams) =>
    normalizeRecommendedJobsResponse(
      (await apiClient.get<ApiResponse<RecommendationContent<RecommendedJob>>>('/api/recommendations/jobs', { params })).data
    ),
  candidates: async (jobId: number, params?: RecommendationParams) =>
    normalizeRecommendedCandidatesResponse(
      (await apiClient.get<ApiResponse<RecommendationContent<RecommendedCandidate>>>(`/api/recommendations/jobs/${jobId}/candidates`, { params })).data
    ),
}

export const jobTypesApi = {
  all: async () => normalizeCategoriesResponse((await apiClient.get<ApiResponse<JobType[]>>('/api/categories')).data),
  create: async (data: Pick<JobType, 'tenLoaiCongViec'>) => {
    const response = (await apiClient.post<ApiResponse<JobType>>('/api/categories', toCategoryPayload(data))).data
    return response.content ? { ...response, content: normalizeCategory(response.content) } : response
  },
  update: async (id: number, data: Partial<Pick<JobType, 'tenLoaiCongViec'>>) => {
    const response = (await apiClient.put<ApiResponse<JobType>>(`/api/categories/${id}`, toCategoryPayload(data))).data
    return response.content ? { ...response, content: normalizeCategory(response.content) } : response
  },
  delete: async (id: number) => (await apiClient.delete<ApiResponse<void>>(`/api/categories/${id}`)).data,
}

export const jobDetailTypesApi = {
  all: async () => normalizeSubcategoriesResponse((await apiClient.get<ApiResponse<JobDetailType[]>>('/api/subcategories')).data),
  create: async (data: Partial<JobDetailType>) => {
    const response = (await apiClient.post<ApiResponse<JobDetailType>>('/api/subcategories', toSubcategoryPayload(data))).data
    return response.content ? { ...response, content: normalizeSubcategory(response.content) } : response
  },
  update: async (id: number, data: Partial<JobDetailType>) => {
    const response = (await apiClient.put<ApiResponse<JobDetailType>>(`/api/subcategories/${id}`, toSubcategoryPayload(data))).data
    return response.content ? { ...response, content: normalizeSubcategory(response.content) } : response
  },
  delete: async (id: number) => (await apiClient.delete<ApiResponse<void>>(`/api/subcategories/${id}`)).data,
}

export const commentsApi = {
  all: async () => normalizeCommentsResponse((await apiClient.get<ApiResponse<Comment[]>>('/api/comments')).data),
  create: async (data: CreateComment) => {
    const response = (await apiClient.post<ApiResponse<Comment>>('/api/comments', toCommentPayload(data))).data
    return response.content ? { ...response, content: normalizeComment(response.content) } : response
  },
  delete: async (id: number) => (await apiClient.delete<ApiResponse<void>>(`/api/comments/${id}`)).data,
}

export const hiredJobsApi = {
  all: async () => normalizeHiredJobsResponse((await apiClient.get<ApiResponse<HiredJob[]>>('/api/hires')).data),
  mine: async () => normalizeHiredJobsResponse((await apiClient.get<ApiResponse<HiredJob[]>>('/api/hires/my-hires')).data),
  create: async (data: { maCongViec: number }) => {
    const response = (await apiClient.post<ApiResponse<HiredJob>>('/api/hires', { jobId: data.maCongViec })).data
    return response.content ? { ...response, content: normalizeHiredJob(response.content) } : response
  },
  complete: async (id: number) => {
    const response = (await apiClient.post<ApiResponse<HiredJob>>(`/api/hires/complete/${id}`)).data
    return response.content ? { ...response, content: normalizeHiredJob(response.content) } : response
  },
  delete: async (id: number) => (await apiClient.delete<ApiResponse<void>>(`/api/hires/${id}`)).data,
}

export const usersApi = {
  all: async () => (await apiClient.get<ApiResponse<User[]>>('/api/users')).data,
  profile: async (id: number) => (await apiClient.get<ApiResponse<UserProfile>>(`/api/users/profile/${id}`)).data,
  myProfile: async () => (await apiClient.get<ApiResponse<UserProfile>>('/api/users/me/profile')).data,
  myResume: async () => (await apiClient.get<ApiResponse<UserResume | null>>('/api/users/me/resume')).data,
  importResume: async (data: ImportResume) =>
    (await apiClient.put<ApiResponse<UserResume>>('/api/users/me/resume', data)).data,
  uploadResumeFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await uploadClient.post<ApiResponse<UserResume>>('/api/users/me/resume/file', formData)).data
  },
  updateMyProfile: async (data: UpdateProfile) =>
    (await apiClient.patch<ApiResponse<UserProfile>>('/api/users/me/profile', data)).data,
  replaceSkills: async (skills: Array<Omit<ProfileSkill, 'id'>>) =>
    (await apiClient.put<ApiResponse<UserProfile>>('/api/users/me/profile/skills', { skills })).data,
  replaceCertifications: async (certifications: Array<Omit<ProfileCertification, 'id'>>) =>
    (await apiClient.put<ApiResponse<UserProfile>>('/api/users/me/profile/certifications', { certifications })).data,
  createPortfolioItem: async (data: Omit<ProfilePortfolioItem, 'id'>) =>
    (await apiClient.post<ApiResponse<UserProfile>>('/api/users/me/profile/portfolio', data)).data,
  updatePortfolioItem: async (
    id: number,
    data: Partial<Omit<ProfilePortfolioItem, 'id'>>
  ) => (await apiClient.put<ApiResponse<UserProfile>>(`/api/users/me/profile/portfolio/${id}`, data)).data,
  deletePortfolioItem: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/users/me/profile/portfolio/${id}`)).data,
  update: async (id: number, data: Partial<User>) => (await apiClient.put<ApiResponse<User>>(`/api/users/${id}`, data)).data,
  delete: async (id: number) => (await apiClient.delete<ApiResponse<void>>(`/api/users/${id}`)).data,
  uploadAvatar: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await uploadClient.post<ApiResponse<UserProfile>>('/api/users/upload-avatar', formData)).data
  },
  uploadCover: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await uploadClient.post<ApiResponse<UserProfile>>('/api/users/upload-cover', formData)).data
  },
}

export const skillsApi = {
  all: async () => (await apiClient.get<ApiResponse<string[]>>('/api/skill')).data,
}

export const chatApi = {
  rooms: async () => (await apiClient.get<ApiResponse<ChatRoom[]>>('/api/chat/rooms')).data,
  room: async (id: number) => (await apiClient.get<ApiResponse<ChatRoom>>(`/api/chat/rooms/${id}`)).data,
  messages: async (roomId: number) =>
    (await apiClient.get<ApiResponse<ChatMessage[]>>(`/api/chat/rooms/${roomId}/messages`)).data,
  start: async (userId: number) => (await apiClient.get<ApiResponse<ChatRoom>>(`/api/chat/start/${userId}`)).data,
  createRoom: async (data: { name?: string; memberIds: number[] }) =>
    (await apiClient.post<ApiResponse<ChatRoom>>('/api/chat/rooms', data)).data,
}
