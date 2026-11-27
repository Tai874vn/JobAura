'use client'

/**
 * Creates the shared axios clients (`apiClient` for JSON and `uploadClient` for file uploads) used across the app to talk to the backend. Adds the CSRF header on requests, refreshes expired access tokens once on 401 errors, and clears the local session when refresh fails.
 *
 * Calls: POST /api/auth/refresh; resolveClientOrigin; csrfTokenForMethod; clearCsrfTokenCookie; getQueryClient; resetClientSession; useChatStore; getSessionExpiredRedirect
 * Used by:
 *   - 17 files, for example features/contracts/api.ts, features/hiring-pipeline/api.ts, features/occupations/api.ts
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { resolveClientOrigin } from '@/shared/config/client-origin'
import { env } from '@/shared/config/env'
import { getSessionExpiredRedirect } from '@/shared/lib/session-routing'
import { useChatStore } from '@/shared/stores/chat-store'
import { clearCsrfTokenCookie, csrfTokenForMethod, csrfTokenFromCookie, hasCsrfTokenCookie } from './csrf'
import type { ApiResponse, UserProfile } from '@/shared/schemas'
import { getQueryClient } from './query-client'
import { queryKeys } from './query-keys'
import { resetClientSession, setCachedSession } from './session-cache'

/*
 * THE FRONTEND'S CONNECTION TO THE BACKEND.
 *
 * axios is a library for sending HTTP requests. Every page talks to the
 * backend through apiClient (JSON) or uploadClient (files).
 *
 * Two interceptors (functions that run on every request or response, like a
 * checkpoint) are installed here:
 *  1. Before each request → add the X-CSRF-Token header (copied from the
 *     csrf_token cookie). The backend rejects changes without it, so another
 *     website cannot act as the user.
 *  2. After each response → if the backend says 401 because the access token
 *     expired, call /api/auth/refresh ONCE, then repeat the original request.
 *     The user never notices the 10-minute token expiring.
 *     If the refresh itself fails (session cancelled, refresh token reused…),
 *     clear the saved user data and send the user to the login page.
 *
 * withCredentials: true = send the login cookies with every request.
 */
type RefreshFlight = { promise: Promise<void> | null }
type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _refreshFlight?: RefreshFlight
  metadata?: { csrfAtSend?: string }
}

// Shared by both clients in this tab only. Cross-tab REFRESH_REUSED is terminal;
// this does not add consumed-token replay or any reuse grace.
let refreshFlight: RefreshFlight = { promise: null }
const API_TIMEOUT_MS = 15_000
const ACCESS_TOKEN_ERRORS = new Set(['ACCESS_TOKEN_EXPIRED', 'ACCESS_TOKEN_MISSING', 'INVALID_ACCESS_TOKEN'])
const TERMINAL_AUTH_ERRORS = new Set(['SESSION_REVOKED', 'REFRESH_REUSED', 'REFRESH_TOKEN_EXPIRED', 'INVALID_REFRESH_TOKEN'])

const clientApiBaseUrl = resolveClientOrigin(
  env.apiBaseUrl,
  env.useSameOriginApi,
  typeof window === 'undefined' ? undefined : window.location.origin
)

export const apiClient = axios.create({
  baseURL: clientApiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
})

export const uploadClient = axios.create({
  baseURL: clientApiBaseUrl,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
})

function currentCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined
  return csrfTokenFromCookie(document.cookie)
}

function installCsrfInterceptor(instance: typeof apiClient | typeof uploadClient) {
  instance.interceptors.request.use((config: RetryConfig) => {
    config._refreshFlight = refreshFlight
    config.metadata = { ...config.metadata, csrfAtSend: currentCsrfToken() }
    const token = csrfTokenForMethod(config.method)
    if (token) config.headers.set('X-CSRF-Token', token)
    return config
  })
}

installCsrfInterceptor(apiClient)
installCsrfInterceptor(uploadClient)

function handleSessionExpired(isGuestSessionCheck = false, csrfAtSend?: string) {
  const client = getQueryClient()
  const knownUser = client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content
  if (csrfAtSend && currentCsrfToken() === csrfAtSend) {
    clearCsrfTokenCookie()
  }
  // A first guest /me check is not a logout. Removing other queries here can
  // strand their active observers while public pages are still loading.
  if (isGuestSessionCheck && !knownUser) {
    setCachedSession(null, client)
  } else {
    resetClientSession(client)
  }
  useChatStore.getState().reset()
  if (typeof window !== 'undefined') {
    const redirect = getSessionExpiredRedirect(window.location.pathname, window.location.search)
    if (redirect) window.location.href = redirect
  }
}

function authErrorCode(error: AxiosError): string | undefined {
  const data = error.response?.data
  if (data && typeof data === 'object' && 'code' in data && typeof data.code === 'string') return data.code
}

function isTerminalAuthError(error: unknown): boolean {
  return axios.isAxiosError(error)
    && error.response?.status === 401
    && TERMINAL_AUTH_ERRORS.has(authErrorCode(error) ?? '')
}

/**
 * Ask the backend for new tokens. If 5 requests fail with 401 at the same
 * moment, they all wait for the SAME refresh call (one shared promise — a
 * promise is a value that arrives later). Calling refresh 5 times would use
 * the same refresh token twice, and the backend treats that as theft.
 */
function refreshSession(flight: RefreshFlight): Promise<void> {
  if (!flight.promise) {
    const csrfToken = csrfTokenForMethod('post')
    flight.promise = axios.post(`${clientApiBaseUrl}/api/auth/refresh`, {}, {
      withCredentials: true,
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
      timeout: API_TIMEOUT_MS,
    }).then(() => undefined).catch((error: unknown) => {
      // An untyped refresh 401 is terminal for legacy backends only.
      if (isTerminalAuthError(error) || (axios.isAxiosError(error) && error.response?.status === 401 && !authErrorCode(error))) {
        handleSessionExpired(false, csrfToken)
      }
      throw error
    }).finally(() => {
      // New requests get a fresh flight; delayed 401s retain this settled one.
      if (refreshFlight === flight) refreshFlight = { promise: null }
    })
  }
  return flight.promise
}

function shouldSkipRefresh(request: RetryConfig) {
  const url = (request.url ?? '').split(/[?#]/)[0]
  return (
    url.includes('/api/auth/refresh') ||
    url.endsWith('/api/auth/logout') ||
    url.includes('/api/auth/signin') ||
    url.includes('/api/auth/signup') ||
    url.includes('/api/auth/verify-email') ||
    url.includes('/api/auth/forgot-password') ||
    url.includes('/api/auth/reset-password') ||
    url.includes('/api/auth/google')
  )
}

function installRefreshInterceptor(instance: typeof apiClient | typeof uploadClient) {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryConfig | undefined

      if (error.response?.status !== 401 || !originalRequest) {
        return Promise.reject(error)
      }

      if (isTerminalAuthError(error)) {
        handleSessionExpired(originalRequest.url === '/api/auth/me', originalRequest.metadata?.csrfAtSend)
        return Promise.reject(error)
      }

      const code = authErrorCode(error)
      if (originalRequest._retry || shouldSkipRefresh(originalRequest) || (code && !ACCESS_TOKEN_ERRORS.has(code))) {
        return Promise.reject(error)
      }

      if (!hasCsrfTokenCookie()) {
        handleSessionExpired(originalRequest.url === '/api/auth/me', originalRequest.metadata?.csrfAtSend)
        return Promise.reject(error)
      }

      // Mark the request so it is retried only once (no endless loop), refresh, then send it again.
      originalRequest._retry = true

      await refreshSession(originalRequest._refreshFlight ?? refreshFlight)
      return instance(originalRequest)
    }
  )
}

installRefreshInterceptor(apiClient)
installRefreshInterceptor(uploadClient)
