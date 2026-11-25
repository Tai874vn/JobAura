'use server'

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
