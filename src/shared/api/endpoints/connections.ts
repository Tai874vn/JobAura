/**
 * Defines API calls for user connections: listing connections, pending requests, and suggestions, checking status, and sending, accepting, or removing requests.
 *
 * Calls: apiClient; GET /api/connections; GET /api/connections/requests; GET /api/connections/suggestions; POST /api/connections/requests/:userId; normalizeConnectionsResponse; normalizeConnectionRequestsResponse; normalizeConnectionSuggestionsResponse
 * Used by:
 *   - shared/api/endpoints.ts
 */

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
  // Backend: GET /api/connections → NestjsBE/src/modules/connections/services/connections.service.ts getConnections()
  all: async (params: ConnectionsParams = {}) =>
    normalizeConnectionsResponse(
      (await apiClient.get<ApiResponse<PaginatedContent<Connection>>>('/api/connections', { params })).data,
    ),
  // Backend: GET /api/connections/requests → NestjsBE/src/modules/connections/services/connections.service.ts getRequests()
  requests: async () =>
    normalizeConnectionRequestsResponse(
      (await apiClient.get<ApiResponse<ConnectionRequests>>('/api/connections/requests')).data,
    ),
  // Backend: GET /api/connections/suggestions → NestjsBE/src/modules/connections/services/connections.service.ts getSuggestions()
  suggestions: async (params: ConnectionsParams = {}) =>
    normalizeConnectionSuggestionsResponse(
      (
        await apiClient.get<ApiResponse<PaginatedContent<ConnectionSuggestion>>>(
          '/api/connections/suggestions',
          { params },
        )
      ).data,
    ),
  // Backend: GET /api/connections/status/:userId → NestjsBE/src/modules/connections/services/connections.service.ts getStatus()
  status: async (userId: number) =>
    (await apiClient.get<ApiResponse<ConnectionStatus>>(`/api/connections/status/${userId}`)).data,
  // Backend: POST /api/connections/requests/:userId → NestjsBE/src/modules/connections/services/connections.service.ts sendRequest()
  send: async (userId: number) =>
    (await apiClient.post<ApiResponse<Connection>>(`/api/connections/requests/${userId}`)).data,
  // Backend: PUT /api/connections/requests/:id/accept → NestjsBE/src/modules/connections/services/connections.service.ts acceptRequest()
  accept: async (connectionId: number) =>
    (await apiClient.put<ApiResponse<Connection>>(`/api/connections/requests/${connectionId}/accept`)).data,
  // Backend: DELETE /api/connections/:id → NestjsBE/src/modules/connections/services/connections.service.ts deleteConnection()
  remove: async (connectionId: number) =>
    (await apiClient.delete<ApiResponse<void>>(`/api/connections/${connectionId}`)).data,
}
