'use client'

/**
 * Hook that returns the current signed-in user, loading state, and auth flag. It waits for client hydration and checks for the CSRF cookie before requesting /api/auth/me.
 *
 * Calls: GET /api/auth/me; hasCsrfTokenCookie; queryKeys.me
 * Used by:
 *   - 44 files, for example features/admin/components/admin-dashboard.tsx, features/admin/components/admin-shell.tsx, features/auth/components/auth-form-layout.tsx
 */

import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { hasCsrfTokenCookie } from '@/shared/api/csrf'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'

const subscribeNever = () => () => {}

export function useSession() {
  // Sign-in sets the readable csrf_token cookie and sign-out clears it, so without it nobody is signed in here:
  // don't ask the server (a visitor would only get a 401). Cookies can't be read during the server render or the
  // hydration pass, so the session counts as loading until hydration ends, and only then is the server asked.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)
  const hasSessionCookie = hydrated && hasCsrfTokenCookie()
  // Data: authApi.me → GET /api/auth/me → NestjsBE/src/modules/auth/services/auth.service.ts getCurrentUser()
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
    enabled: hasSessionCookie,
  })
  const user = hasSessionCookie ? query.data?.content ?? null : null

  return {
    user,
    isLoading: !hydrated || (hasSessionCookie && query.isPending),
    isAuthenticated: Boolean(user),
  }
}
