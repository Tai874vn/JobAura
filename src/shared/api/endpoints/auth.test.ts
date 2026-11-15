import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '../client'
import { authApi } from './auth'

const originalAdapter = apiClient.defaults.adapter

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
})

describe('auth logout', () => {
  it('posts to the refresh-cookie path with CSRF and preserves the response shape', async () => {
    vi.stubGlobal('document', { cookie: 'csrf_token=logout-csrf' })
    let request: InternalAxiosRequestConfig | undefined
    const data = { message: 'Logged out successfully', content: null }
    apiClient.defaults.adapter = async (config) => {
      request = config
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    }

    expect(await authApi.logout()).toEqual(data)
    expect(request?.url).toBe('/api/auth/refresh/logout')
    expect(request?.method).toBe('post')
    expect(request?.withCredentials).toBe(true)
    expect(request?.headers.get('X-CSRF-Token')).toBe('logout-csrf')
  })

  it('posts logout-all with the existing credentials and response envelope', async () => {
    vi.stubGlobal('document', { cookie: 'csrf_token=logout-all-csrf' })
    let request: InternalAxiosRequestConfig | undefined
    const data = { message: 'All sessions logged out successfully', content: null }
    apiClient.defaults.adapter = async (config) => {
      request = config
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    }

    expect(await authApi.logoutAll()).toEqual(data)
    expect(request?.url).toBe('/api/auth/logout-all')
    expect(request?.method).toBe('post')
    expect(request?.withCredentials).toBe(true)
    expect(request?.headers.get('X-CSRF-Token')).toBe('logout-all-csrf')
  })

  it('patches a password change without altering the payload or response envelope', async () => {
    vi.stubGlobal('document', { cookie: 'csrf_token=password-csrf' })
    let request: InternalAxiosRequestConfig | undefined
    const data = { message: 'Password changed successfully', content: null }
    apiClient.defaults.adapter = async (config) => {
      request = config
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    }
    const passwords = { currentPassword: 'old-password', newPassword: 'new-password' }

    expect(await authApi.changePassword(passwords)).toEqual(data)
    expect(request?.url).toBe('/api/auth/password')
    expect(request?.method).toBe('patch')
    expect(JSON.parse(request!.data)).toEqual(passwords)
    expect(request?.withCredentials).toBe(true)
    expect(request?.headers.get('X-CSRF-Token')).toBe('password-csrf')
  })
})
