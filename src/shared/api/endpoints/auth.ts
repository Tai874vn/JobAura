/**
 * Defines authentication and account security API calls: sign-in, sign-up, email verification, password reset and change, current user lookup, realtime tickets, token refresh, and logout.
 *
 * Calls: apiClient; POST /api/auth/signin; POST /api/auth/signup; GET /api/auth/me; POST /api/auth/refresh; POST /api/auth/refresh/logout; POST /api/auth/reset-password; PATCH /api/auth/password
 * Used by:
 *   - shared/api/endpoints.ts
 */

import { apiClient } from '../client'
import type { ApiResponse, SignIn, SignUp, UserProfile } from '@/shared/schemas'

export type ChangePasswordRequest = { currentPassword: string; newPassword: string }
/** Sign-up does not sign in: the account must open the mailed confirm link first. */
export type SignUpResult = { user: UserProfile; verificationRequired: true; mailSent: boolean }

export const authApi = {
  // Backend: POST /api/auth/signin → NestjsBE/src/modules/auth/services/auth.service.ts signIn()
  signIn: async (data: SignIn) =>
    (
      await apiClient.post<ApiResponse<{ user: UserProfile }>>(
        '/api/auth/signin',
        data,
      )
    ).data,
  // Backend: POST /api/auth/signup → NestjsBE/src/modules/auth/services/auth.service.ts signUp()
  signUp: async (data: SignUp) =>
    (
      await apiClient.post<ApiResponse<SignUpResult>>(
        '/api/auth/signup',
        data,
      )
    ).data,
  // Backend: POST /api/auth/verify-email → NestjsBE/src/modules/auth/services/email-verification.service.ts verify()
  verifyEmail: async (token: string) =>
    (await apiClient.post<ApiResponse<{ email: string }>>('/api/auth/verify-email', { token })).data,
  // Backend: POST /api/auth/verify-email/resend → NestjsBE/src/modules/auth/services/email-verification.service.ts resendForEmail()
  resendVerification: async (email: string) =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/verify-email/resend', { email })).data,
  // Backend: POST /api/auth/forgot-password → NestjsBE/src/modules/auth/services/password-reset.service.ts request()
  forgotPassword: async (email: string) =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/forgot-password', { email })).data,
  // Backend: POST /api/auth/reset-password → NestjsBE/src/modules/auth/services/password-reset.service.ts reset()
  resetPassword: async (data: { token: string; password: string }) =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/reset-password', data)).data,
  // Backend: GET /api/auth/me → NestjsBE/src/modules/auth/services/auth.service.ts getCurrentUser()
  me: async () =>
    (await apiClient.get<ApiResponse<UserProfile>>('/api/auth/me')).data,
  // Backend: GET /api/auth/realtime-ticket → NestjsBE/src/modules/auth/services/realtime-ticket.service.ts issue()
  realtimeTicket: async () =>
    (
      await apiClient.get<
        ApiResponse<{ token: string; expiresInSeconds: number }>
      >('/api/auth/realtime-ticket')
    ).data,
  // Backend: POST /api/auth/refresh → NestjsBE/src/modules/auth/services/auth.service.ts refreshTokens()
  refresh: async () =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/refresh')).data,
  // Backend: POST /api/auth/refresh/logout → NestjsBE/src/modules/auth/services/auth.service.ts logout()
  logout: async () =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/refresh/logout')).data,
  // Backend: POST /api/auth/logout-all → NestjsBE/src/modules/auth/session/auth-session.service.ts logoutAll()
  logoutAll: async () =>
    (await apiClient.post<ApiResponse<void>>('/api/auth/logout-all')).data,
  // Backend: PATCH /api/auth/password → NestjsBE/src/modules/auth/session/auth-session.service.ts changePassword()
  changePassword: async (data: ChangePasswordRequest) =>
    (await apiClient.patch<ApiResponse<void>>('/api/auth/password', data)).data,
}
