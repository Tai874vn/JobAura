'use client'

import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'

export function useSession() {
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
  })
  const user = query.data?.content ?? null

  return {
    user,
    isLoading: query.isPending,
    isAuthenticated: Boolean(user),
  }
}
