'use client'

import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/shared/api/endpoints/users'
import { queryKeys } from '@/shared/api/query-keys'

/**
 * The signed-in user's own resume, only while `enabled` (they are looking at their own profile).
 *
 * `enabled: false` only stops the request: React Query still returns whatever is already cached under
 * `users/me/resume`. Without the check below, someone who had opened Settings or applied to a post would see
 * THEIR resume on every other person's profile.
 */
export function useOwnResume(enabled: boolean) {
  const query = useQuery({ queryKey: queryKeys.myResume, queryFn: usersApi.myResume, enabled, retry: false })
  return {
    resume: enabled ? (query.data?.content ?? null) : null,
    isPending: enabled && query.isPending,
  }
}
