'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { csrfTokenFromCookie } from '@/shared/api/csrf'
import { normalizeJobResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Comment, Job, UserProfile } from '@/shared/schemas'

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null
}

/**
 * Clears the server cache (ISR Data Cache) for `/jobs`, `/welcome`, `/jobs/<id>`, and the creator's
 * `/profile/<id>` right after a portfolio/service post is created or edited.
 *
 * Re-reads both the caller session and the saved job using the caller's own cookies so only the
 * post owner or an admin can trigger revalidation, and every path is built from the server answer.
 */
export async function refreshJobPagesAfterSave(jobId: number): Promise<void> {
  const safeId = positiveId(jobId)
  if (!safeId) return

  const [meResponse, jobResponse] = await Promise.all([
    serverRequest<ApiResponse<UserProfile>>('/api/auth/me'),
    serverRequest<ApiResponse<Job & { binhLuans?: Comment[] }>>(`/api/jobs/details/${safeId}`),
  ])

  if (!meResponse.ok || !jobResponse.ok) return
  const viewer = meResponse.data?.content
  const viewerId = positiveId(viewer?.id)
  if (!viewer || !viewerId) return

  const job = normalizeJobResponse(jobResponse.data).content
  const verifiedJobId = positiveId(job?.id)
  if (!job || !verifiedJobId) return

  const creatorId = positiveId(job.creatorId ?? job.user?.id)
  const canRefresh = viewer.role === 'admin' || (creatorId !== null && creatorId === viewerId)
  if (!canRefresh) return

  revalidatePath('/jobs')
  revalidatePath('/welcome')
  revalidatePath(`/jobs/${verifiedJobId}`)
  if (creatorId) revalidatePath(`/profile/${creatorId}`)
}

export type DeleteJobResult = { ok: true } | { ok: false; status: number; message: string }

function errorText(error: string | string[], fallback: string): string {
  const text = Array.isArray(error) ? error[0] : error
  return typeof text === 'string' && text.trim() ? text : fallback
}

/**
 * Deletes a portfolio or service post and then clears the server's cached copies of the pages that showed it.
 *
 * The delete itself runs here, on the Next.js server, with the caller's own sign-in cookies, so the backend still
 * decides who may delete the post. The post is read first (again with the caller's cookies) and every page path is
 * built from that answer: the post id and its owner come from the backend, never from the browser. The cache is
 * cleared only when the backend confirms the delete.
 */
export async function deleteJobAndRefresh(jobId: number): Promise<DeleteJobResult> {
  const safeId = positiveId(jobId)
  if (!safeId) return { ok: false, status: 400, message: 'This post id is not valid.' }

  const jobResponse = await serverRequest<ApiResponse<Job & { binhLuans?: Comment[] }>>(`/api/jobs/details/${safeId}`)
  if (!jobResponse.ok) {
    return { ok: false, status: jobResponse.status, message: errorText(jobResponse.error, 'Could not find this post.') }
  }
  const job = normalizeJobResponse(jobResponse.data).content
  const verifiedJobId = positiveId(job?.id)
  if (!job || !verifiedJobId) return { ok: false, status: 404, message: 'Could not find this post.' }
  const creatorId = positiveId(job.user?.id ?? job.creatorId)

  // The backend refuses a change without the X-CSRF-Token header (a copy of the csrf_token cookie), exactly as
  // for a browser request. The browser's Origin and Referer are passed on too, as the /api proxy does.
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const csrfToken = csrfTokenFromCookie(cookieStore.toString())
  const forwarded = new Headers()
  if (csrfToken) forwarded.set('X-CSRF-Token', csrfToken)
  for (const name of ['origin', 'referer']) {
    const value = requestHeaders.get(name)
    if (value) forwarded.set(name, value)
  }

  const deleteResponse = await serverRequest<ApiResponse<void>>(`/api/jobs/${verifiedJobId}`, {
    method: 'DELETE',
    headers: forwarded,
  })
  if (!deleteResponse.ok) {
    return { ok: false, status: deleteResponse.status, message: errorText(deleteResponse.error, 'Could not delete this post.') }
  }

  revalidatePath('/jobs')
  revalidatePath('/welcome')
  revalidatePath(`/jobs/${verifiedJobId}`)
  if (creatorId) revalidatePath(`/profile/${creatorId}`)
  return { ok: true }
}
