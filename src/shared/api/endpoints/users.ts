/**
 * Defines API calls for user profiles, candidate directory search, resumes, portfolio items, avatar and cover uploads, and skill dictionary search and extraction.
 *
 * Calls: apiClient; uploadClient; assertValidImageFile; normalizePaginatedCandidatesResponse; GET /api/users/candidates; GET /api/users/me/profile; GET /api/users/me/resume; GET /api/skill/search
 * Used by:
 *   - 11 files, for example features/hiring/components/detail/apply-panel.tsx, features/users/components/profile/profile-page.tsx, features/users/components/resume/resume-career-fields.tsx
 */

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
  // Backend: GET /api/users → NestjsBE/src/modules/users/services/users.service.ts findAll()
  all: async () => (await apiClient.get<ApiResponse<User[]>>('/api/users')).data,
  // Backend: GET /api/users/candidates → NestjsBE/src/modules/users/services/candidate-directory.service.ts findCandidates()
  candidates: async (params: CandidateDirectoryParams) =>
    normalizePaginatedCandidatesResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<CandidateProfile>>>(
          '/api/users/candidates',
          { params },
        )
      ).data,
    ),
  // Backend: GET /api/users/profile/:id → NestjsBE/src/modules/users/services/user-profile.service.ts getPublicProfile()
  profile: async (id: number) =>
    (await apiClient.get<ApiResponse<UserProfile>>(`/api/users/profile/${id}`)).data,
  // Backend: GET /api/users/me/profile → NestjsBE/src/modules/users/services/user-profile.service.ts getMyProfile()
  myProfile: async () =>
    (await apiClient.get<ApiResponse<UserProfile>>('/api/users/me/profile')).data,
  // Backend: GET /api/users/me/resume → NestjsBE/src/modules/users/services/user-resume.service.ts getMyResume()
  myResume: async (): Promise<ApiResponse<UserResume | null>> => {
    try {
      return (await apiClient.get<ApiResponse<UserResume | null>>('/api/users/me/resume')).data
    } catch (error) {
      // The backend answers 404 until the user saves a resume; that is an empty form, not a failure.
      if (axios.isAxiosError(error) && error.response?.status === 404) return { message: 'No resume yet', content: null }
      throw error
    }
  },
  // Backend: PUT /api/users/me/resume → NestjsBE/src/modules/users/services/user-resume.service.ts importResume()
  importResume: async (data: ImportResume) =>
    (await apiClient.put<ApiResponse<UserResume>>('/api/users/me/resume', data)).data,
  // Backend: POST /api/users/me/resume/seniority → NestjsBE/src/modules/users/services/user-resume.service.ts predictResumeSeniority()
  predictResumeSeniority: async () =>
    (await apiClient.post<ApiResponse<UserResume>>('/api/users/me/resume/seniority')).data,
  // Backend: POST /api/users/me/resume/file → NestjsBE/src/modules/users/services/user-uploads.service.ts uploadResumeFile()
  uploadResumeFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return (
      await uploadClient.post<ApiResponse<UserResume>>('/api/users/me/resume/file', formData)
    ).data
  },
  // Backend: PATCH /api/users/me/profile → NestjsBE/src/modules/users/services/user-profile.service.ts updateMyProfile()
  updateMyProfile: async (data: UpdateProfile) =>
    (await apiClient.patch<ApiResponse<UserProfile>>('/api/users/me/profile', data)).data,
  // Backend: PUT /api/users/me/profile/skills → NestjsBE/src/modules/users/services/user-profile.service.ts replaceProfileSkills()
  replaceSkills: async (skills: Array<Omit<ProfileSkill, 'id'>>) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>('/api/users/me/profile/skills', { skills })
    ).data,
  // Backend: PUT /api/users/me/profile/certifications → NestjsBE/src/modules/users/services/user-profile.service.ts replaceProfileCertifications()
  replaceCertifications: async (
    certifications: Array<Omit<ProfileCertification, 'id'>>,
  ) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>(
        '/api/users/me/profile/certifications',
        { certifications },
      )
    ).data,
  // Backend: POST /api/users/me/profile/portfolio → NestjsBE/src/modules/users/services/user-portfolio.service.ts createPortfolioItem()
  createPortfolioItem: async (data: Omit<ProfilePortfolioItem, 'id'>) =>
    (
      await apiClient.post<ApiResponse<UserProfile>>('/api/users/me/profile/portfolio', data)
    ).data,
  // Backend: PUT /api/users/me/profile/portfolio/:id → NestjsBE/src/modules/users/services/user-portfolio.service.ts updatePortfolioItem()
  updatePortfolioItem: async (
    id: number,
    data: Partial<Omit<ProfilePortfolioItem, 'id'>>,
  ) =>
    (
      await apiClient.put<ApiResponse<UserProfile>>(`/api/users/me/profile/portfolio/${id}`, data)
    ).data,
  // Backend: DELETE /api/users/me/profile/portfolio/:id → NestjsBE/src/modules/users/services/user-portfolio.service.ts deletePortfolioItem()
  deletePortfolioItem: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/users/me/profile/portfolio/${id}`)).data,
  // Backend: PUT /api/users/:id → NestjsBE/src/modules/users/services/users.service.ts update()
  update: async (id: number, data: Partial<User>) =>
    (await apiClient.put<ApiResponse<User>>(`/api/users/${id}`, data)).data,
  // Backend: DELETE /api/users/:id → NestjsBE/src/modules/users/services/users.service.ts remove()
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/users/${id}`)).data,
  // Backend: POST /api/users/upload-avatar → NestjsBE/src/modules/users/services/user-uploads.service.ts uploadAvatar()
  uploadAvatar: async (file: File) => {
    assertValidImageFile(file, { label: 'Avatar' })
    const formData = new FormData()
    formData.append('file', file)
    return (
      await uploadClient.post<ApiResponse<UserProfile>>('/api/users/upload-avatar', formData)
    ).data
  },
  // Backend: POST /api/users/upload-cover → NestjsBE/src/modules/users/services/user-uploads.service.ts uploadCover()
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
  hot: boolean
}

export type FoundSkill = DictionarySkill & { matched: string[]; count: number }

export type FieldOfStudy = { code: string; name: string; broad: string; narrow: string }

export const skillsApi = {
  // Backend: GET /api/skill → NestjsBE/src/modules/skill/services/skill.service.ts findAll()
  all: async () => (await apiClient.get<ApiResponse<string[]>>('/api/skill')).data,
  // Backend: GET /api/skill/search → NestjsBE/src/modules/skill/services/skill.service.ts search()
  search: async (q: string, field?: string, limit = 10) =>
    (await apiClient.get<ApiResponse<DictionarySkill[]>>('/api/skill/search', {
      params: { q, limit, ...(field ? { field } : {}) },
    })).data,
  /** Skills named in CV text, as suggestions for the user to confirm. */
  // Backend: POST /api/skill/extract → NestjsBE/src/modules/skill/services/skill.service.ts extract()
  extract: async (text: string) =>
    (await apiClient.post<ApiResponse<FoundSkill[]>>('/api/skill/extract', { text: text.slice(0, 20000) })).data,
  // Backend: GET /api/skill/fields-of-study → NestjsBE/src/modules/skill/services/skill.service.ts fieldsOfStudy()
  fieldsOfStudy: async () =>
    (await apiClient.get<ApiResponse<FieldOfStudy[]>>('/api/skill/fields-of-study')).data,
}
