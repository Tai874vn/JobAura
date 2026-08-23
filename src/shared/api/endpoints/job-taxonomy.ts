import { apiClient } from '../client'
import type { ApiResponse, JobDetailType, JobType } from '@/shared/schemas'
import { normalizeCategoriesResponse, normalizeCategory, normalizeSubcategoriesResponse, normalizeSubcategory, toCategoryPayload, toSubcategoryPayload } from '../normalizers'

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
    ).data
    return response.content
      ? { ...response, content: normalizeCategory(response.content) }
      : response
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
    ).data
    return response.content
      ? { ...response, content: normalizeCategory(response.content) }
      : response
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/categories/${id}`)).data,
}

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
    ).data
    return response.content
      ? { ...response, content: normalizeSubcategory(response.content) }
      : response
  },
  update: async (id: number, data: Partial<JobDetailType>) => {
    const response = (
      await apiClient.put<ApiResponse<JobDetailType>>(
        `/api/subcategories/${id}`,
        toSubcategoryPayload(data),
      )
    ).data
    return response.content
      ? { ...response, content: normalizeSubcategory(response.content) }
      : response
  },
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/subcategories/${id}`))
      .data,
}
