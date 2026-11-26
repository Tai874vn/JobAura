'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/features/auth/use-session'
import { usersApi } from '@/shared/api/endpoints/users'
import { queryKeys } from '@/shared/api/query-keys'

/**
 * The signed-in user's own resume, only while `enabled` (they are looking at their own profile).
 *
 * `enabled: false` only stops the request: React Query still returns whatever is already cached under
 * `users/me/resume`. Without the check below, someone who had opened Settings or applied to a post would see
 * THEIR resume on every other person's profile.
 */
export function useOwnResume(enabled: boolean, viewerId?: number | null) {
  const { user } = useSession()
  const resolvedViewerId = viewerId ?? user?.id
  const query = useQuery({ queryKey: queryKeys.myResume(resolvedViewerId), queryFn: usersApi.myResume, enabled, retry: false })
  return {
    resume: enabled ? (query.data?.content ?? null) : null,
    isPending: enabled && query.isPending,
  }
}
