'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { csrfTokenFromCookie } from '@/shared/api/csrf'
import { normalizeJobResponse } from '@/shared/api/normalizers'
import {
  reportServerRequestFailure,
  serverRequest,
  type ServerRequestFailure,
} from '@/shared/api/server'
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

  const jobPath = `/api/jobs/details/${safeId}`
  const [meResponse, jobResponse] = await Promise.all([
    serverRequest<ApiResponse<UserProfile>>('/api/auth/me'),
    serverRequest<ApiResponse<Job & { binhLuans?: Comment[] }>>(jobPath),
  ])

  if (!meResponse.ok) reportServerRequestFailure(meResponse, 'cache:revalidate-job', '/api/auth/me')
  if (!jobResponse.ok) reportServerRequestFailure(jobResponse, 'cache:revalidate-job', jobPath)
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

export type DeleteJobResult =
  | { ok: true }
  | {
      ok: false
      status: number
      message: string
      requestId?: string
      code?: string
      reported?: boolean
    }

function toDeleteFailure(
  response: ServerRequestFailure,
  source: string,
  path: string,
): Extract<DeleteJobResult, { ok: false }> {
  const reported = reportServerRequestFailure(response, source, path)
  // Redact 5xx and server-side network errors before crossing the Server Action boundary.
  // Map server-to-backend connectivity outages (status 0) to 503 so an online user sees
  // a server error rather than "You seem to be offline."
  // The UI boundary runs toUserError once with the status, requestId, and code.
  const raw = Array.isArray(response.error) ? response.error[0] : response.error
  const message =
    response.status >= 500 || response.status === 0
      ? ''
      : typeof raw === 'string'
        ? raw
        : ''
  return {
    ok: false,
    status: response.status === 0 ? 503 : response.status,
    message,
    ...(response.requestId ? { requestId: response.requestId } : {}),
    ...(response.code ? { code: response.code } : {}),
    ...(reported ? { reported: true } : {}),
  }
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

  const detailPath = `/api/jobs/details/${safeId}`
  const jobResponse = await serverRequest<ApiResponse<Job & { binhLuans?: Comment[] }>>(detailPath)
  if (!jobResponse.ok) {
    return toDeleteFailure(jobResponse, 'server-action:delete-job', detailPath)
  }
  const job = normalizeJobResponse(jobResponse.data).content
  const verifiedJobId = positiveId(job?.id)
  if (!job || !verifiedJobId) return { ok: false, status: 404, message: '' }
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

  const deletePath = `/api/jobs/${verifiedJobId}`
  const deleteResponse = await serverRequest<ApiResponse<void>>(deletePath, {
    method: 'DELETE',
    headers: forwarded,
  })
  if (!deleteResponse.ok) {
    return toDeleteFailure(deleteResponse, 'server-action:delete-job', deletePath)
  }

  revalidatePath('/jobs')
  revalidatePath('/welcome')
  revalidatePath(`/jobs/${verifiedJobId}`)
  if (creatorId) revalidatePath(`/profile/${creatorId}`)
  return { ok: true }
}
