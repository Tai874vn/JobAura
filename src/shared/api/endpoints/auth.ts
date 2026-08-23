import { apiClient } from '../client'
import type { ApiResponse, SignIn, SignUp, UserProfile } from '@/shared/schemas'

export const authApi = {
  signIn: async (data: SignIn) =>
    (
      await apiClient.post<ApiResponse<{ user: UserProfile }>>(
        '/api/auth/signin',
        data,
      )
    ).data,
  signUp: async (data: SignUp) =>
    (
      await apiClient.post<ApiResponse<{ user: UserProfile }>>(
        '/api/auth/signup',
        data,
      )
    ).data,
  me: async () =>
    (await apiClient.get<ApiResponse<UserProfile>>('/api/auth/me')).data,
  refresh: async () =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/refresh')).data,
  logout: async () =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/logout')).data,
}
