import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
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
})
