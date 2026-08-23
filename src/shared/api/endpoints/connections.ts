import { apiClient } from '../client'
import {
  normalizeConnectionRequestsResponse,
  normalizeConnectionsResponse,
  normalizeConnectionSuggestionsResponse,
} from '../normalizers'
import type {
  ApiResponse,
  Connection,
  ConnectionRequests,
  ConnectionStatus,
  ConnectionSuggestion,
  PaginatedContent,
} from '@/shared/schemas'

type ConnectionsParams = { page?: number; pageSize?: number; keyword?: string }

export const connectionsApi = {
  all: async (params: ConnectionsParams = {}) =>
    normalizeConnectionsResponse(
      (await apiClient.get<ApiResponse<PaginatedContent<Connection>>>('/api/connections', { params })).data,
    ),
  requests: async () =>
    normalizeConnectionRequestsResponse(
      (await apiClient.get<ApiResponse<ConnectionRequests>>('/api/connections/requests')).data,
    ),
  suggestions: async (params: ConnectionsParams = {}) =>
    normalizeConnectionSuggestionsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<ConnectionSuggestion>>>(
          '/api/connections/suggestions',
          { params },
        )
      ).data,
    ),
  status: async (userId: number) =>
    (await apiClient.get<ApiResponse<ConnectionStatus>>(`/api/connections/status/${userId}`)).data,
  send: async (userId: number) =>
    (await apiClient.post<ApiResponse<Connection>>(`/api/connections/requests/${userId}`)).data,
  accept: async (connectionId: number) =>
    (await apiClient.put<ApiResponse<Connection>>(`/api/connections/requests/${connectionId}/accept`)).data,
  remove: async (connectionId: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/connections/${connectionId}`)).data,
}
