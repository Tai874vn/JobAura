import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from './query-keys'
import { resetClientSession, setCachedSession } from './session-cache'
import type { ApiResponse, UserProfile } from '@/shared/schemas'

describe('session cache', () => {
  it('stores and clears the authenticated user in one cache entry', () => {
    const client = new QueryClient()
    const user = { id: 1, name: 'Jane', email: 'jane@example.com' } as UserProfile

    setCachedSession(user, client)
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toEqual(user)

    setCachedSession(null, client)
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toBeUndefined()
  })

  it('removes private query data when the client session ends', () => {
    const client = new QueryClient()
    client.setQueryData(queryKeys.savedPosts, { content: { data: [{ id: 99 }] } })
    client.setQueryData(queryKeys.notifications, { content: { data: [{ id: 42 }] } })

    resetClientSession(client)

    expect(client.getQueryData(queryKeys.savedPosts)).toBeUndefined()
    expect(client.getQueryData(queryKeys.notifications)).toBeUndefined()
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toBeUndefined()
  })

  it('removes cached mutation results when the client session ends', async () => {
    const client = new QueryClient()
    const mutation = client.getMutationCache().build(client, {
      mutationFn: async () => ({ privateResult: true }),
    })
    await mutation.execute(undefined)

    resetClientSession(client)

    expect(client.getMutationCache().getAll()).toHaveLength(0)
  })

  it('settles an active session observer when the session is reset during its request', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const observer = new QueryObserver<ApiResponse<UserProfile>>(client, {
      queryKey: queryKeys.me,
      queryFn: async () => {
        resetClientSession(client)
        throw new Error('Unauthorized')
      },
    })
    const unsubscribe = observer.subscribe(() => undefined)

    await vi.waitFor(() => expect(observer.getCurrentResult().isPending).toBe(false))
    expect(observer.getCurrentResult().data?.content).toBeUndefined()

    unsubscribe()
  })
})
