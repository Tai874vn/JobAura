import { AxiosError } from 'axios'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@/shared/schemas'
import { queryKeys } from './query-keys'
import { setCachedSession } from './session-cache'
import { apiClient, uploadClient } from './client'

const cache = vi.hoisted(() => ({ client: undefined as QueryClient | undefined }))
vi.mock('./query-client', () => ({ getQueryClient: () => cache.client }))

beforeEach(() => { cache.client = new QueryClient({ defaultOptions: { queries: { retry: false } } }) })

function guestSessionRequest() {
  return apiClient.get('/api/auth/me', {
    adapter: async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        status: 401, statusText: 'Unauthorized', data: { message: 'Unauthorized' }, headers: {}, config,
      })
    },
  })
}

describe('API client timeouts', () => {
  it('bounds regular and upload requests', () => {
    expect(apiClient.defaults.timeout).toBe(15_000)
    expect(uploadClient.defaults.timeout).toBe(15_000)
  })
})

describe('Guest session checks', () => {
  it('does not strand an in-flight public query when the guest session returns 401', async () => {
    const client = cache.client!
    let finish!: (value: { content: string[] }) => void
    const observer = new QueryObserver(client, {
      queryKey: queryKeys.jobs({ page: 1 }),
      queryFn: () => new Promise<{ content: string[] }>((resolve) => { finish = resolve }),
    })
    const unsubscribe = observer.subscribe(() => undefined)
    try {
      await expect(guestSessionRequest()).rejects.toMatchObject({ response: { status: 401 } })
      finish({ content: ['Visible service'] })
      await vi.waitFor(() => expect(observer.getCurrentResult().isPending).toBe(false))
      expect(observer.getCurrentResult().data).toEqual({ content: ['Visible service'] })
    } finally { unsubscribe() }
  })

  it('still removes private data when a known signed-in session expires', async () => {
    const client = cache.client!
    setCachedSession({ id: 1, name: 'Ava' } as UserProfile, client)
    client.setQueryData(queryKeys.savedPosts(1), { content: ['Private post'] })
    await expect(guestSessionRequest()).rejects.toMatchObject({ response: { status: 401 } })
    expect(client.getQueryData(queryKeys.savedPosts(1))).toBeUndefined()
    expect(client.getQueryData<{ content?: UserProfile }>(queryKeys.me)?.content).toBeUndefined()
  })
})
