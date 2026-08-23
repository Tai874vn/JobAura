'use client'

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/shared/config/env'
import { getSessionExpiredRedirect } from '@/shared/lib/session-routing'
import { useChatStore } from '@/shared/stores/chat-store'
import { csrfTokenForMethod, hasCsrfTokenCookie } from './csrf'
import { setCachedSession } from './session-cache'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }
type QueueItem = {
  resolve: () => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let failedQueue: QueueItem[] = []

function flushQueue(error?: unknown) {
  failedQueue.forEach((item) => {
    if (error) item.reject(error)
    else item.resolve()
  })
  failedQueue = []
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

export const uploadClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
})

function installCsrfInterceptor(instance: typeof apiClient | typeof uploadClient) {
  instance.interceptors.request.use((config) => {
    const token = csrfTokenForMethod(config.method)
    if (token) config.headers.set('X-CSRF-Token', token)
    return config
  })
}

installCsrfInterceptor(apiClient)
installCsrfInterceptor(uploadClient)

function handleSessionExpired() {
  setCachedSession(null)
  useChatStore.getState().reset()
  if (typeof window !== 'undefined') {
    const redirect = getSessionExpiredRedirect(window.location.pathname)
    if (redirect) window.location.href = redirect
  }
}

async function refreshSession() {
  const csrfToken = csrfTokenForMethod('post')
  await axios.post(`${env.apiBaseUrl}/api/auth/refresh`, {}, {
    withCredentials: true,
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
  })
}

function shouldSkipRefresh(request: RetryConfig) {
  const url = request.url ?? ''
  return (
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout') ||
    url.includes('/api/auth/signin') ||
    url.includes('/api/auth/signup') ||
    url.includes('/api/auth/google')
  )
}

function installRefreshInterceptor(instance: typeof apiClient | typeof uploadClient) {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryConfig | undefined

      if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || shouldSkipRefresh(originalRequest)) {
        return Promise.reject(error)
      }

      if (!hasCsrfTokenCookie()) {
        handleSessionExpired()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => instance(originalRequest))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await refreshSession()
        flushQueue()
        return instance(originalRequest)
      } catch (refreshError) {
        flushQueue(refreshError)
        handleSessionExpired()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
  )
}

installRefreshInterceptor(apiClient)
installRefreshInterceptor(uploadClient)
