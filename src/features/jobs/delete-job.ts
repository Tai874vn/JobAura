import { authApi } from '@/shared/api/endpoints'
import { RequestError } from '@/shared/lib/errors'
import { deleteJobAndRefresh } from './refresh-job-pages'

/**
 * Deletes a portfolio or service post through the server action, which also clears the cached public pages.
 * The sign-in (access) token lasts 10 minutes; if it ran out, the server action gets a 401. Then one normal browser
 * request (/api/auth/me) lets the axios client renew the token, and the delete is tried once more.
 * Throws a RequestError with status and requestId when the delete fails, so toUserError and Sentry handle it cleanly.
 */
export async function deleteJob(jobId: number): Promise<void> {
  let result = await deleteJobAndRefresh(jobId)
  if (!result.ok && result.status === 401) {
    await authApi.me()
    result = await deleteJobAndRefresh(jobId)
  }
  if (!result.ok) {
    throw new RequestError(
      result.message,
      result.status,
      result.requestId,
      result.code,
      { reported: result.reported },
    )
  }
}
