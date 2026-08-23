'use client'

import type { QueryClient } from '@tanstack/react-query'
import { appQueryClient } from './query-client'
import { queryKeys } from './query-keys'
import type { ApiResponse, UserProfile } from '@/shared/schemas'

export function setCachedSession(
  user: UserProfile | null,
  client: QueryClient = appQueryClient,
) {
  client.setQueryData<ApiResponse<UserProfile>>(queryKeys.me, (current) => ({
    ...current,
    content: user ?? undefined,
  }))
}
