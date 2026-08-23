import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { queryKeys } from './query-keys'
import { setCachedSession } from './session-cache'
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
})
