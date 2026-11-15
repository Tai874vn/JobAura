import axios from 'axios'
import { apiClient, uploadClient } from '../client'
import { normalizePaginatedCandidatesResponse } from '../normalizers'
import { assertValidImageFile } from '@/shared/lib/file-validation'
import type {
  ApiResponse,
  CandidateDirectoryParams,
  CandidateProfile,
  ImportResume,
  PaginatedContent,
  ProfileCertification,
  ProfilePortfolioItem,
  ProfileSkill,
  UpdateProfile,
  User,
  UserProfile,
  UserResume,
} from '@/shared/schemas'

export const usersApi = {
  all: async () => (await apiClient.get<ApiResponse<User[]>>('/api/users')).data,
  candidates: async (params: CandidateDirectoryParams) =>
    normalizePaginatedCandidatesResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<CandidateProfile>>>(
          '/api/users/candidates',
          { params },
        )
      ).data,
    ),
  profile: async (id: number) =>
    (await apiClient.get<ApiResponse<UserProfile>>(`/api/users/profile/${id}`)).data,
  myProfile: async () =>
    (await apiClient.get<ApiResponse<UserProfile>>('/api/users/me/profile')).data,
  myResume: async (): Promise<ApiResponse<UserResume | null>> => {
    try {
      return (await apiClient.get<ApiResponse<UserResume | null>>('/api/users/me/resume')).data
    } catch (error) {
      // The backend answers 404 until the user saves a resume; that is an empty form, not a failure.
      if (axios.isAxiosError(error) && error.response?.status === 404) return { message: 'No resume yet', content: null }
      throw error
    }
  },
  importResume: async (data: ImportResume) =>
    (await apiClient.put<ApiResponse<UserResume>>('/api/users/me/resume', data)).data,
  predictResumeSeniority: async () =>
    (await apiClient.post<ApiResponse<UserResume>>('/api/users/me/resume/seniority')).data,
  uploadResumeFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return (
      await uploadClient.post<ApiResponse<UserResume>>('/api/users/me/resume/file', formData)
    ).data
  },
  updateMyProfile: async (data: UpdateProfile) =>
    (await apiClient.patch<ApiResponse<UserProfile>>('/api/users/me/profile', data)).data,
  replaceSkills: async (skills: Array<Omit<ProfileSkill, 'id'>>) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>('/api/users/me/profile/skills', { skills })
    ).data,
  replaceCertifications: async (
    certifications: Array<Omit<ProfileCertification, 'id'>>,
  ) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>(
        '/api/users/me/profile/certifications',
        { certifications },
      )
    ).data,
  createPortfolioItem: async (data: Omit<ProfilePortfolioItem, 'id'>) =>
    (
      await apiClient.post<ApiResponse<UserProfile>>('/api/users/me/profile/portfolio', data)
    ).data,
  updatePortfolioItem: async (
    id: number,
    data: Partial<Omit<ProfilePortfolioItem, 'id'>>,
  ) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>(`/api/users/me/profile/portfolio/${id}`, data)
    ).data,
  deletePortfolioItem: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/users/me/profile/portfolio/${id}`)).data,
  update: async (id: number, data: Partial<User>) =>
    (await apiClient.put<ApiResponse<User>>(`/api/users/${id}`, data)).data,
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/users/${id}`)).data,
  uploadAvatar: async (file: File) => {
    assertValidImageFile(file, { label: 'Avatar' })
    const formData = new FormData()
    formData.append('file', file)
    return (
      await uploadClient.post<ApiResponse<UserProfile>>('/api/users/upload-avatar', formData)
    ).data
  },
  uploadCover: async (file: File) => {
    assertValidImageFile(file, { label: 'Cover image' })
    const formData = new FormData()
    formData.append('file', file)
    return (
      await uploadClient.post<ApiResponse<UserProfile>>('/api/users/upload-cover', formData)
    ).data
  },
}

/** A skill from JobAura's dictionary (ESCO and O*NET), served by the AI service through the backend. */
export type DictionarySkill = {
  id: string
  name: string
  kind: string
  reuse: string | null
  fields: Record<string, number>
  hot: boolean
}

export type FoundSkill = DictionarySkill & { matched: string[]; count: number }

export type FieldOfStudy = { code: string; name: string; broad: string; narrow: string }

export const skillsApi = {
  all: async () => (await apiClient.get<ApiResponse<string[]>>('/api/skill')).data,
  search: async (q: string, field?: string, limit = 10) =>
    (await apiClient.get<ApiResponse<DictionarySkill[]>>('/api/skill/search', {
      params: { q, limit, ...(field ? { field } : {}) },
    })).data,
  /** Skills named in CV text, as suggestions for the user to confirm. */
  extract: async (text: string) =>
    (await apiClient.post<ApiResponse<FoundSkill[]>>('/api/skill/extract', { text: text.slice(0, 20000) })).data,
  fieldsOfStudy: async () =>
    (await apiClient.get<ApiResponse<FieldOfStudy[]>>('/api/skill/fields-of-study')).data,
}
