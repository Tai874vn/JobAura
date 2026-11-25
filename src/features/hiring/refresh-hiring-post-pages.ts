'use server'

import { revalidatePath } from 'next/cache'
import { normalizeHiringPost } from '@/shared/api/normalizers'
import { reportServerRequestFailure, serverRequest } from '@/shared/api/server'
import { applicationDetailSchema, type ApiResponse, type HiringPost, type UserProfile } from '@/shared/schemas'

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null
}

/**
 * Clears the server cache for `/hiring-posts` and `/hiring-posts/<id>` right after a recruiter or
 * admin creates, edits, closes, reopens, or re-scores a hiring post, or after a hired candidate's
 * accepted offer fills the last opening and closes the post.
 *
 * Re-reads `/api/auth/me` and either `/api/hiring-posts/<id>` (for recruiters/admins) or
 * `/api/applications/<id>` (for a hired candidate whose accept closed the post) with the caller's
 * cookies so paths are built strictly from the server response.
 */
export async function refreshHiringPostPages(
  postId: number,
  options?: { applicationId?: number },
): Promise<void> {
  const safeId = positiveId(postId)
  if (!safeId) return

  if (options?.applicationId !== undefined) {
    const safeApplicationId = positiveId(options.applicationId)
    if (!safeApplicationId) return

    const applicationPath = `/api/applications/${safeApplicationId}`
    const [meResponse, applicationResponse] = await Promise.all([
      serverRequest<ApiResponse<UserProfile>>('/api/auth/me'),
      serverRequest<{ content: unknown }>(applicationPath),
    ])

    if (!meResponse.ok) reportServerRequestFailure(meResponse, 'cache:revalidate-hiring-post', '/api/auth/me')
    if (!applicationResponse.ok) reportServerRequestFailure(applicationResponse, 'cache:revalidate-hiring-post', applicationPath)
    if (!meResponse.ok || !applicationResponse.ok) return

    const viewer = meResponse.data?.content
    const viewerId = positiveId(viewer?.id)
    if (!viewer || !viewerId) return

    const parsed = applicationDetailSchema.safeParse(applicationResponse.data?.content)
    if (!parsed.success) return
    const application = parsed.data
    const closedPost = application.hiringPost
    const verifiedPostId = positiveId(closedPost?.id)
    const canRefresh =
      verifiedPostId === safeId &&
      closedPost?.status === 'CLOSED' &&
      application.status === 'HIRED' &&
      (viewer.role === 'admin' || application.applicantId === viewerId)
    if (!canRefresh) return

    revalidatePath('/hiring-posts')
    revalidatePath(`/hiring-posts/${verifiedPostId}`)
    return
  }

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
