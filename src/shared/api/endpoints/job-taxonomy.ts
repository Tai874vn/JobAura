import { apiClient } from '../client'
import type { ApiResponse, Subcategory, Category } from '@/shared/schemas'
import { normalizeCategoriesResponse, normalizeCategory, normalizeSubcategoriesResponse, normalizeSubcategory, toCategoryPayload, toSubcategoryPayload } from '../normalizers'

export const categoriesApi = {
  all: async () =>
    normalizeCategoriesResponse(
      (await apiClient.get<ApiResponse<Category[]>>("/api/categories")).data,
    ),
  create: async (data: Pick<Category, "name">) => {
    const response = (
      await apiClient.post<ApiResponse<Category>>(
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
    data: Partial<Pick<Category, "name">>,
  ) => {
    const response = (
      await apiClient.put<ApiResponse<Category>>(
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

export const subcategoriesApi = {
  all: async () =>
    normalizeSubcategoriesResponse(
      (await apiClient.get<ApiResponse<Subcategory[]>>("/api/subcategories"))
        .data,
    ),
  create: async (data: Partial<Subcategory>) => {
    const response = (
      await apiClient.post<ApiResponse<Subcategory>>(
        "/api/subcategories",
        toSubcategoryPayload(data),
      )
    ).data
    return response.content
      ? { ...response, content: normalizeSubcategory(response.content) }
      : response
  },
  update: async (id: number, data: Partial<Subcategory>) => {
    const response = (
      await apiClient.put<ApiResponse<Subcategory>>(
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
