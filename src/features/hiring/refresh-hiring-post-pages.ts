'use server'

import { revalidatePath } from 'next/cache'
import { normalizeHiringPost } from '@/shared/api/normalizers'
import { reportServerRequestFailure, serverRequest } from '@/shared/api/server'
import type { ApiResponse, HiringPost, UserProfile } from '@/shared/schemas'

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null
}

/**
 * Clears the server cache for `/hiring-posts` and `/hiring-posts/<id>` right after a recruiter or
 * admin creates, edits, closes, reopens, or re-scores a hiring post.
 *
 * Re-reads both `/api/auth/me` and `/api/hiring-posts/<id>` with the caller's cookies (closed posts
 * remain readable by their owner and admins) so paths are built strictly from the server response.
 */
export async function refreshHiringPostPages(postId: number): Promise<void> {
  const safeId = positiveId(postId)
  if (!safeId) return

  const postPath = `/api/hiring-posts/${safeId}`
  const [meResponse, postResponse] = await Promise.all([
    serverRequest<ApiResponse<UserProfile>>('/api/auth/me'),
    serverRequest<ApiResponse<HiringPost>>(postPath),
  ])

  if (!meResponse.ok) reportServerRequestFailure(meResponse, 'cache:revalidate-hiring-post', '/api/auth/me')
  if (!postResponse.ok) reportServerRequestFailure(postResponse, 'cache:revalidate-hiring-post', postPath)
  if (!meResponse.ok || !postResponse.ok) return
  const viewer = meResponse.data?.content
  const viewerId = positiveId(viewer?.id)
  if (!viewer || !viewerId) return

  const rawPost = postResponse.data?.content
  if (!rawPost) return
  const post = normalizeHiringPost(rawPost)
  const verifiedPostId = positiveId(post.id)
  if (!verifiedPostId) return

  const canRefresh = viewer.role === 'admin' || post.recruiterId === viewerId
  if (!canRefresh) return

  revalidatePath('/hiring-posts')
  revalidatePath(`/hiring-posts/${verifiedPostId}`)
}
