'use server'

/**
 * Server action that revalidates the signed-in user's cached public profile page (/profile/[id]) after they edit their profile or resume. Reads the caller's ID from the current session cookies instead of trusting browser input.
 *
 * Calls: GET /api/auth/me; serverRequest; reportServerRequestFailure
 * Used by:
 *   - features/users/components/profile/profile-page.tsx
 *   - features/workspace/components/settings/resume-settings-editor.tsx
 *   - features/workspace/hooks/use-profile-settings.ts
 */

import { revalidatePath } from 'next/cache'
import { reportServerRequestFailure, serverRequest } from '@/shared/api/server'
import type { ApiResponse, UserProfile } from '@/shared/schemas'

/**
 * Clears the server cache for the caller's own public `/profile/<id>` page right after they update
 * their profile, media, portfolio items, or resume.
 *
 * Accepts no path or id from the browser: the profile id is always read from `/api/auth/me` using
 * the caller's own sign-in cookies.
 */
export async function refreshMyProfilePage(): Promise<void> {
  const response = await serverRequest<ApiResponse<UserProfile>>('/api/auth/me')
  if (!response.ok) {
    reportServerRequestFailure(response, 'cache:revalidate-profile', '/api/auth/me')
    return
  }
  const viewerId = response.data?.content?.id
  if (typeof viewerId !== 'number' || !Number.isInteger(viewerId) || viewerId < 1) return

  revalidatePath(`/profile/${viewerId}`)
}
