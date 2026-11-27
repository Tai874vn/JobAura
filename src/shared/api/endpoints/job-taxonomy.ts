/**
 * Defines API calls to list, create, update, and delete job categories and subcategories, shaping payloads and normalizing responses.
 *
 * Calls: apiClient; GET /api/categories; GET /api/subcategories; normalizeCategoriesResponse; normalizeSubcategoriesResponse; toCategoryPayload; toSubcategoryPayload
 * Used by:
 *   - shared/api/endpoints.ts
 */

import { apiClient } from '../client'
import type { ApiResponse, Subcategory, Category } from '@/shared/schemas'
import { normalizeCategoriesResponse, normalizeCategory, normalizeSubcategoriesResponse, normalizeSubcategory, toCategoryPayload, toSubcategoryPayload } from '../normalizers'

export const categoriesApi = {
  // Backend: GET /api/categories → NestjsBE/src/modules/categories/services/categories.service.ts findAll()
  all: async () =>
    normalizeCategoriesResponse(
      (await apiClient.get<ApiResponse<Category[]>>("/api/categories")).data,
    ),
  // Backend: POST /api/categories → NestjsBE/src/modules/categories/services/categories.service.ts create()
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
  // Backend: PUT /api/categories/:id → NestjsBE/src/modules/categories/services/categories.service.ts update()
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
  // Backend: DELETE /api/categories/:id → NestjsBE/src/modules/categories/services/categories.service.ts remove()
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/categories/${id}`)).data,
}

export const subcategoriesApi = {
  // Backend: GET /api/subcategories → NestjsBE/src/modules/subcategories/services/subcategories.service.ts findAll()
  all: async () =>
    normalizeSubcategoriesResponse(
      (await apiClient.get<ApiResponse<Subcategory[]>>("/api/subcategories"))
        .data,
    ),
  // Backend: POST /api/subcategories → NestjsBE/src/modules/subcategories/services/subcategories.service.ts create()
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
  // Backend: PUT /api/subcategories/:id → NestjsBE/src/modules/subcategories/services/subcategories.service.ts update()
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
  // Backend: DELETE /api/subcategories/:id → NestjsBE/src/modules/subcategories/services/subcategories.service.ts remove()
  delete: async (id: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/subcategories/${id}`))
      .data,
}
