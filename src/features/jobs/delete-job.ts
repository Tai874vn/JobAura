import { authApi } from '@/shared/api/endpoints'
import { deleteJobAndRefresh } from './refresh-job-pages'

/**
 * Deletes a portfolio or service post through the server action, which also clears the cached public pages.
 * The sign-in (access) token lasts 10 minutes; if it ran out, the server action gets a 401. Then one normal browser
 * request (/api/auth/me) lets the axios client renew the token, and the delete is tried once more.
 * Throws an Error with the backend's sentence when the delete fails, so the caller's toast can show it.
 */
export async function deleteJob(jobId: number): Promise<void> {
  let result = await deleteJobAndRefresh(jobId)
  if (!result.ok && result.status === 401) {
    await authApi.me()
    result = await deleteJobAndRefresh(jobId)
  }
  if (!result.ok) throw new Error(result.message)
}
