import { apiClient } from '../client'
import type { ApiResponse, SignIn, SignUp, UserProfile } from '@/shared/schemas'

export type ChangePasswordRequest = { currentPassword: string; newPassword: string }
/** Sign-up does not sign in: the account must open the mailed confirm link first. */
export type SignUpResult = { user: UserProfile; verificationRequired: true; mailSent: boolean }

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
      await apiClient.post<ApiResponse<SignUpResult>>(
        '/api/auth/signup',
        data,
      )
    ).data,
  verifyEmail: async (token: string) =>
    (await apiClient.post<ApiResponse<{ email: string }>>('/api/auth/verify-email', { token })).data,
  resendVerification: async (email: string) =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/verify-email/resend', { email })).data,
  forgotPassword: async (email: string) =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/forgot-password', { email })).data,
  resetPassword: async (data: { token: string; password: string }) =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/reset-password', data)).data,
  me: async () =>
    (await apiClient.get<ApiResponse<UserProfile>>('/api/auth/me')).data,
  realtimeTicket: async () =>
    (
      await apiClient.get<
        ApiResponse<{ token: string; expiresInSeconds: number }>
      >('/api/auth/realtime-ticket')
    ).data,
  refresh: async () =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/refresh')).data,
  logout: async () =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/refresh/logout')).data,
  logoutAll: async () =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/logout-all')).data,
  changePassword: async (data: ChangePasswordRequest) =>
    (await apiClient.patch<ApiResponse<void>>('/api/auth/password', data)).data,
}
