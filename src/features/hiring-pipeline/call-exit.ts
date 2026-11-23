import { AxiosError } from 'axios'

/**
 * Where the person goes when they leave the call page.
 * - candidate: always My applications, with the application open
 * - recruiter: the post's applicants, with the outcome dialog open when `outcome` is true
 */
export function callExitHref(input: {
  role: 'recruiter' | 'candidate'
  postId: number
  applicationId: number
  outcome?: boolean
}): string {
  if (input.role === 'candidate') return `/my-applications?application=${input.applicationId}`
  const base = `/my-hiring-posts/${input.postId}/applicants?application=${input.applicationId}`
  return input.outcome ? `${base}&outcome=1` : base
}

/** True when "complete" was refused (409) only because the interview is already done, so leaving is still right. */
export function isAlreadyCompleted(error: unknown): boolean {
  if (!(error instanceof AxiosError) || error.response?.status !== 409) return false
  const message = (error.response.data as { message?: unknown } | undefined)?.message
  return typeof message === 'string' && /already completed/i.test(message)
}
