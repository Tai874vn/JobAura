'use server'

import { revalidatePath } from 'next/cache'
import { reportServerRequestFailure, serverRequest } from '@/shared/api/server'
import { contractDetailSchema } from '@/shared/schemas'

/**
 * Called after a review is sent from the contract panel. The service page (`/jobs/<id>`) keeps its data for
 * 5 minutes (a server cache), so without this the new review would not show there for up to 5 minutes.
 *
 * This is a "server action" (a function the browser calls, which runs on the Next.js server). It reads the
 * contract again with the caller's own sign-in cookie, so only a person who can see the contract can use it,
 * and the service id comes from the server, not from the browser. It only clears the cache when the contract
 * really has a review. Clearing the cache changes no data; the next visit simply reads the page fresh.
 */
export async function refreshServicePageAfterReview(contractId: number): Promise<void> {
  if (!Number.isInteger(contractId) || contractId < 1) return
  const path = `/api/contracts/${contractId}`
  const response = await serverRequest<{ content: unknown }>(path)
  if (!response.ok) {
    reportServerRequestFailure(response, 'cache:revalidate-service', path)
    return
  }
  const parsed = contractDetailSchema.safeParse(response.data?.content)
  if (!parsed.success || !parsed.data.review) return
  revalidatePath(`/jobs/${parsed.data.job.id}`)
}
