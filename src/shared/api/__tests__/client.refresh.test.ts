import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@/shared/schemas'
import { useChatStore } from '@/shared/stores/chat-store'
import { csrfTokenFromCookie, hasCsrfTokenCookie } from '../csrf'
import { queryKeys } from '../query-keys'
import { setCachedSession } from '../session-cache'
import { apiClient, uploadClient } from '../client'

const cache = vi.hoisted(() => ({ client: undefined as QueryClient | undefined }))
vi.mock('../query-client', () => ({ getQueryClient: () => cache.client }))

const originalAdapters = [axios.defaults.adapter, apiClient.defaults.adapter, uploadClient.defaults.adapter]
const terminalCodes = ['SESSION_REVOKED', 'REFRESH_REUSED', 'REFRESH_TOKEN_EXPIRED', 'INVALID_REFRESH_TOKEN']

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((finish) => { resolve = finish })
  return { promise, resolve }
}

function response(config: InternalAxiosRequestConfig, data: unknown = { content: 'ok' }) {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

function httpError(config: InternalAxiosRequestConfig, status: number, code?: string) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
    status, statusText: 'Request failed', headers: {}, config,
    data: { statusCode: status, message: code ?? 'Unauthorized', ...(code ? { code } : {}) },
  })
}

function seedSession() {
  setCachedSession({ id: 1, name: 'Ava' } as UserProfile, cache.client)
  cache.client!.setQueryData(queryKeys.savedPosts(1), { content: ['Private post'] })
  useChatStore.setState({ isOpen: true, isSocketActive: true })
}

function expectSessionRetained() {
  expect(cache.client!.getQueryData(queryKeys.me)).toMatchObject({ content: { id: 1 } })
  expect(cache.client!.getQueryData(queryKeys.savedPosts(1))).toEqual({ content: ['Private post'] })
  expect(useChatStore.getState().isOpen).toBe(true)
  expect(useChatStore.getState().isSocketActive).toBe(true)
}

function expectSessionCleared() {
  expect(cache.client!.getQueryData<{ content?: UserProfile }>(queryKeys.me)?.content).toBeUndefined()
  expect(cache.client!.getQueryData(queryKeys.savedPosts(1))).toBeUndefined()
  expect(useChatStore.getState().isOpen).toBe(false)
  expect(useChatStore.getState().isSocketActive).toBe(false)
}

beforeEach(() => {
  cache.client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useChatStore.getState().reset()
  vi.stubGlobal('document', { cookie: 'csrf_token=refresh%2Fcsrf' })
  const rejectNetwork: AxiosAdapter = async () => { throw new Error('Unexpected network request') }
  axios.defaults.adapter = rejectNetwork
  apiClient.defaults.adapter = rejectNetwork
  uploadClient.defaults.adapter = rejectNetwork
})

afterEach(() => {
  axios.defaults.adapter = originalAdapters[0]
  apiClient.defaults.adapter = originalAdapters[1]
  uploadClient.defaults.adapter = originalAdapters[2]
  cache.client!.clear()
  useChatStore.getState().reset()
  vi.unstubAllGlobals()
})

describe('single-flight auth refresh', () => {
  it('shares one refresh across concurrent regular and upload requests', async () => {
    const refresh = deferred()
    const refreshRequests: InternalAxiosRequestConfig[] = []
    const requests = new Map<string, InternalAxiosRequestConfig[]>()
    axios.defaults.adapter = async (config) => {
      refreshRequests.push(config)
      await refresh.promise
      return response(config)
    }
    const adapter: AxiosAdapter = async (config) => {
      const attempts = [...(requests.get(config.url!) ?? []), config]
      requests.set(config.url!, attempts)
      if (attempts.length === 1) throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
      return response(config, { content: config.url })
    }
    const pending = Promise.all([
      apiClient.get('/api/private/one', { adapter }),
      apiClient.get('/api/private/two', { adapter }),
      uploadClient.post('/api/private/upload', 'file-body', { adapter }),
    ])
    try {
      await vi.waitFor(() => {
        expect(requests.size).toBe(3)
        expect(refreshRequests).toHaveLength(1)
      })
    } finally { refresh.resolve() }

    expect((await pending).map((result) => result.data.content)).toEqual([
      '/api/private/one', '/api/private/two', '/api/private/upload',
    ])
    expect(refreshRequests).toHaveLength(1)
    expect(refreshRequests[0].url).toMatch(/\/api\/auth\/refresh$/)
    expect(refreshRequests[0].method).toBe('post')
    expect(refreshRequests[0].withCredentials).toBe(true)
    expect(refreshRequests[0].timeout).toBe(15_000)
    expect(refreshRequests[0].headers.get('X-CSRF-Token')).toBe('refresh/csrf')
    expect([...requests.values()].map((attempts) => attempts.length)).toEqual([2, 2, 2])
    expect(requests.get('/api/private/upload')![1].data).toBe('file-body')
    expect(requests.get('/api/private/upload')![1].headers.get('X-CSRF-Token')).toBe('refresh/csrf')
  })

  it.each([apiClient, uploadClient])('retries a waiting request at most once', async (waitingClient) => {
    const refresh = deferred()
    let refreshCalls = 0
    const attempts = new Map<string, number>()
    axios.defaults.adapter = async (config) => {
      refreshCalls++
      await refresh.promise
      return response(config)
    }
    const adapter: AxiosAdapter = async (config) => {
      const count = (attempts.get(config.url!) ?? 0) + 1
      attempts.set(config.url!, count)
      if (count === 1 || (config.url === '/api/private/waiting' && count === 2)) {
        throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
      }
      return response(config)
    }
    const pending = Promise.allSettled([
      apiClient.get('/api/private/leader', { adapter }),
      waitingClient.get('/api/private/waiting', { adapter }),
    ])
    try {
      await vi.waitFor(() => {
        expect(attempts.size).toBe(2)
        expect(refreshCalls).toBe(1)
      })
    } finally { refresh.resolve() }

    expect((await pending).map((result) => result.status)).toEqual(['fulfilled', 'rejected'])
    expect(refreshCalls).toBe(1)
    expect(attempts.get('/api/private/leader')).toBe(2)
    expect(attempts.get('/api/private/waiting')).toBe(2)
  })

  it.each(['ACCESS_TOKEN_EXPIRED', 'ACCESS_TOKEN_MISSING', 'INVALID_ACCESS_TOKEN', undefined])(
    'refreshes a recoverable or legacy 401 (%s) once', async (code) => {
      let refreshCalls = 0
      let attempts = 0
      axios.defaults.adapter = async (config) => { refreshCalls++; return response(config) }
      const result = await apiClient.get('/api/private', {
        adapter: async (config) => {
          if (++attempts === 1) throw httpError(config, 401, code)
          return response(config)
        },
      })

      expect(result.data).toEqual({ content: 'ok' })
      expect(refreshCalls).toBe(1)
      expect(attempts).toBe(2)
    },
  )

  it('retries a delayed concurrent 401 using the completed refresh instead of rotating again', async () => {
    const delayed = deferred()
    let refreshCalls = 0
    let delayedAttempts = 0
    let fastAttempts = 0
    axios.defaults.adapter = async (config) => { refreshCalls++; return response(config) }
    const slowRequest = uploadClient.get('/api/private/slow', {
      adapter: async (config) => {
        if (++delayedAttempts === 1) {
          await delayed.promise
          throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
        }
        return response(config)
      },
    })
    try {
      await apiClient.get('/api/private/fast', {
        adapter: async (config) => {
          if (++fastAttempts === 1) throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
          return response(config)
        },
      })
    } finally { delayed.resolve() }

    await expect(slowRequest).resolves.toMatchObject({ data: { content: 'ok' } })
    expect(refreshCalls).toBe(1)
    expect(fastAttempts).toBe(2)
    expect(delayedAttempts).toBe(2)
  })

  it('can refresh access before retrying logout-all', async () => {
    let refreshCalls = 0
    let attempts = 0
    axios.defaults.adapter = async (config) => { refreshCalls++; return response(config) }

    await expect(apiClient.post('/api/auth/logout-all', undefined, {
      adapter: async (config) => {
        if (++attempts === 1) throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
        return response(config)
      },
    })).resolves.toMatchObject({ data: { content: 'ok' } })
    expect(refreshCalls).toBe(1)
    expect(attempts).toBe(2)
  })

  it('does not refresh an unrecognized typed 401 or clear the session', async () => {
    seedSession()
    let refreshCalls = 0
    axios.defaults.adapter = async (config) => { refreshCalls++; return response(config) }

    await expect(apiClient.get('/api/private', {
      adapter: async (config) => { throw httpError(config, 401, 'OTHER_UNAUTHORIZED') },
    })).rejects.toMatchObject({ response: { data: { code: 'OTHER_UNAUTHORIZED' } } })

    expect(refreshCalls).toBe(0)
    expectSessionRetained()
  })

  it.each(['/api/auth/signin', '/api/auth/signup', '/api/auth/google', '/api/auth/refresh', '/api/auth/logout', '/api/auth/refresh/logout'])(
    'does not recursively refresh %s', async (url) => {
      let refreshCalls = 0
      axios.defaults.adapter = async (config) => { refreshCalls++; return response(config) }
      await expect(apiClient.post(url, {}, {
        adapter: async (config) => { throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED') },
      })).rejects.toMatchObject({ response: { status: 401 } })
      expect(refreshCalls).toBe(0)
    },
  )
})

describe('terminal auth failures', () => {
  it.each(terminalCodes)('clears the session without refreshing %s', async (code) => {
    seedSession()
    let refreshCalls = 0
    axios.defaults.adapter = async (config) => { refreshCalls++; return response(config) }
    await expect(apiClient.get('/api/private', {
      adapter: async (config) => { throw httpError(config, 401, code) },
    })).rejects.toMatchObject({ response: { data: { code } } })

    expect(refreshCalls).toBe(0)
    expectSessionCleared()
  })

  it.each([...terminalCodes, undefined])('clears the session when refresh returns a terminal 401 (%s)', async (code) => {
    seedSession()
    let refreshCalls = 0
    axios.defaults.adapter = async (config) => { refreshCalls++; throw httpError(config, 401, code) }
    await expect(apiClient.get('/api/private', {
      adapter: async (config) => { throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED') },
    })).rejects.toMatchObject({ response: { status: 401 } })

    expect(refreshCalls).toBe(1)
    expect(hasCsrfTokenCookie()).toBe(false)
    expectSessionCleared()
  })

  it('clears the stale csrf_token cookie on a revoked guest /api/auth/me check when unchanged', async () => {
    expect(hasCsrfTokenCookie()).toBe(true)
    await expect(apiClient.get('/api/auth/me', {
      adapter: async (config) => { throw httpError(config, 401, 'SESSION_REVOKED') },
    })).rejects.toMatchObject({ response: { data: { code: 'SESSION_REVOKED' } } })

    expect(hasCsrfTokenCookie()).toBe(false)
    expect(cache.client!.getQueryData<{ content?: UserProfile }>(queryKeys.me)?.content).toBeUndefined()
  })

  it('keeps a newer csrf_token cookie when it changed after the failed request was sent', async () => {
    await expect(apiClient.get('/api/auth/me', {
      adapter: async (config) => {
        document.cookie = 'csrf_token=fresh%2Fcsrf'
        throw httpError(config, 401, 'SESSION_REVOKED')
      },
    })).rejects.toMatchObject({ response: { data: { code: 'SESSION_REVOKED' } } })

    expect(csrfTokenFromCookie(document.cookie)).toBe('fresh/csrf')
  })

  it('keeps a newer csrf_token cookie when it changed while refresh was in flight', async () => {
    seedSession()
    axios.defaults.adapter = async (config) => {
      document.cookie = 'csrf_token=fresh%2Fcsrf'
      throw httpError(config, 401, 'REFRESH_TOKEN_EXPIRED')
    }
    await expect(apiClient.get('/api/private', {
      adapter: async (config) => { throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED') },
    })).rejects.toMatchObject({ response: { data: { code: 'REFRESH_TOKEN_EXPIRED' } } })

    expect(csrfTokenFromCookie(document.cookie)).toBe('fresh/csrf')
    expectSessionCleared()
  })

  it('does not clear csrf_token when the failed request had no cookie at send time', async () => {
    document.cookie = ''
    await expect(apiClient.get('/api/auth/me', {
      adapter: async (config) => {
        document.cookie = 'csrf_token=fresh%2Fcsrf'
        throw httpError(config, 401, 'SESSION_REVOKED')
      },
    })).rejects.toMatchObject({ response: { data: { code: 'SESSION_REVOKED' } } })

    expect(csrfTokenFromCookie(document.cookie)).toBe('fresh/csrf')

    document.cookie = ''
    await expect(apiClient.get('/api/auth/me', {
      adapter: async (config) => { throw httpError(config, 401, 'SESSION_REVOKED') },
    })).rejects.toMatchObject({ response: { data: { code: 'SESSION_REVOKED' } } })

    expect(document.cookie).toBe('')
  })

  it('still handles a terminal response on a retried request', async () => {
    seedSession()
    let refreshCalls = 0
    let attempts = 0
    axios.defaults.adapter = async (config) => { refreshCalls++; return response(config) }
    await expect(apiClient.get('/api/private', {
      adapter: async (config) => {
        throw httpError(config, 401, ++attempts === 1 ? 'ACCESS_TOKEN_EXPIRED' : 'SESSION_REVOKED')
      },
    })).rejects.toMatchObject({ response: { data: { code: 'SESSION_REVOKED' } } })

    expect(refreshCalls).toBe(1)
    expect(attempts).toBe(2)
    expectSessionCleared()
  })

  it('treats cross-tab refresh reuse as terminal for every waiter without replaying', async () => {
    seedSession()
    const refresh = deferred()
    let refreshCalls = 0
    let attempts = 0
    axios.defaults.adapter = async (config) => {
      refreshCalls++
      await refresh.promise
      throw httpError(config, 401, 'REFRESH_REUSED')
    }
    const adapter: AxiosAdapter = async (config) => {
      attempts++
      throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
    }
    const pending = Promise.allSettled([
      apiClient.get('/api/private/one', { adapter }),
      uploadClient.post('/api/private/two', {}, { adapter }),
    ])
    try {
      await vi.waitFor(() => {
        expect(attempts).toBe(2)
        expect(refreshCalls).toBe(1)
      })
    } finally { refresh.resolve() }

    for (const result of await pending) {
      expect(result.status).toBe('rejected')
      if (result.status === 'rejected') {
        expect(result.reason).toMatchObject({ response: { data: { code: 'REFRESH_REUSED' } } })
      }
    }
    expect(refreshCalls).toBe(1)
    expect(attempts).toBe(2)
    expectSessionCleared()
  })
})

describe('non-terminal refresh failures', () => {
  it.each([503, 429])('shares a failed refresh with a delayed concurrent 401 after %s', async (status) => {
    seedSession()
    const delayed = deferred()
    let refreshCalls = 0
    let failure: AxiosError | undefined
    axios.defaults.adapter = async (config) => {
      refreshCalls++
      failure ??= httpError(config, status)
      throw failure
    }
    const slowRequest = Promise.allSettled([uploadClient.get('/api/private/slow', {
      adapter: async (config) => {
        await delayed.promise
        throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
      },
    })])
    try {
      await expect(apiClient.get('/api/private/fast', {
        adapter: async (config) => { throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED') },
      })).rejects.toMatchObject({ response: { status } })
    } finally { delayed.resolve() }

    const [result] = await slowRequest
    expect(result.status).toBe('rejected')
    if (result.status === 'rejected') expect(result.reason).toBe(failure)
    expect(refreshCalls).toBe(1)
    expectSessionRetained()
  })

  it.each([
    { name: 'network', transportCode: 'ERR_NETWORK' },
    { name: 'timeout', transportCode: 'ECONNABORTED' },
    { name: 'unavailable', status: 503, code: 'AUTH_UNAVAILABLE' },
    { name: 'rate limit', status: 429 },
    { name: 'server error', status: 500 },
    { name: 'CSRF rejection', status: 403 },
    { name: 'unknown typed 401', status: 401, code: 'OTHER_UNAUTHORIZED' },
    { name: 'conflict', status: 409 },
  ])('preserves login and rejects every waiter without replay on $name', async ({ status, code, transportCode }) => {
    seedSession()
    const refresh = deferred()
    let refreshCalls = 0
    let attempts = 0
    let failure: AxiosError | undefined
    axios.defaults.adapter = async (config) => {
      refreshCalls++
      await refresh.promise
      failure = status ? httpError(config, status, code) : new AxiosError('Transport failed', transportCode, config)
      throw failure
    }
    const adapter: AxiosAdapter = async (config) => {
      attempts++
      throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
    }
    const pending = Promise.allSettled([
      apiClient.get('/api/private/one', { adapter }),
      uploadClient.post('/api/private/two', {}, { adapter }),
    ])
    try {
      await vi.waitFor(() => {
        expect(attempts).toBe(2)
        expect(refreshCalls).toBe(1)
      })
    } finally { refresh.resolve() }

    for (const result of await pending) {
      expect(result.status).toBe('rejected')
      if (result.status === 'rejected') expect(result.reason).toBe(failure)
    }
    expect(refreshCalls).toBe(1)
    expect(attempts).toBe(2)
    expectSessionRetained()
  })

  it('allows a later independent request to refresh after a temporary failure', async () => {
    seedSession()
    let refreshCalls = 0
    axios.defaults.adapter = async (config) => {
      if (++refreshCalls === 1) throw httpError(config, 503, 'AUTH_UNAVAILABLE')
      return response(config)
    }
    const adapter: AxiosAdapter = async (config) => { throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED') }
    await expect(apiClient.get('/api/private/first', { adapter })).rejects.toMatchObject({ response: { status: 503 } })
    let attempts = 0
    await expect(apiClient.get('/api/private/later', {
      adapter: async (config) => {
        if (++attempts === 1) throw httpError(config, 401, 'ACCESS_TOKEN_EXPIRED')
        return response(config)
      },
    })).resolves.toMatchObject({ data: { content: 'ok' } })

    expect(refreshCalls).toBe(2)
    expectSessionRetained()
  })
})
