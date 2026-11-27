'use server'

/**
 * Server action for the contracts feature that clears cached service, marketplace, and freelancer profile pages after a review is submitted.
 * Verifies that the signed-in caller belongs to the contract (or is an admin) before revalidating paths.
 *
 * Calls: GET /api/auth/me; GET /api/contracts/:id; serverRequest; reportServerRequestFailure; contractDetailSchema
 * Used by:
 *   - features/contracts/hooks/use-contract-actions.ts
 */

import { revalidatePath } from 'next/cache'
import { reportServerRequestFailure, serverRequest } from '@/shared/api/server'
import { contractDetailSchema, type ApiResponse, type UserProfile } from '@/shared/schemas'

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null
}

/**
 * Called after a review is sent from the contract panel. Service pages, marketplace lists, and the
 * freelancer's profile use a server cache, so clear them so the new review shows right away.
 *
 * Reads both `/api/auth/me` and `/api/contracts/<id>` with the caller's sign-in cookies so only
 * a signed-in contract member or admin can trigger revalidation, and every path comes from the
 * server response rather than from browser input.
 */
export async function refreshServicePageAfterReview(contractId: number): Promise<void> {
  const safeId = positiveId(contractId)
  if (!safeId) return

  const path = `/api/contracts/${safeId}`
  const [meResponse, contractResponse] = await Promise.all([
    serverRequest<ApiResponse<UserProfile>>('/api/auth/me'),
    serverRequest<{ content: unknown }>(path),
  ])

  if (!meResponse.ok) reportServerRequestFailure(meResponse, 'cache:revalidate-service', '/api/auth/me')
  if (!contractResponse.ok) reportServerRequestFailure(contractResponse, 'cache:revalidate-service', path)
  if (!meResponse.ok || !contractResponse.ok) return

  const viewer = meResponse.data?.content
  const viewerId = positiveId(viewer?.id)
  if (!viewer || !viewerId) return

  const parsed = contractDetailSchema.safeParse(contractResponse.data?.content)
  if (!parsed.success || !parsed.data.review) return

  const contract = parsed.data
  const canRefresh =
    viewer.role === 'admin' ||
    contract.client.id === viewerId ||
    contract.freelancer.id === viewerId
  if (!canRefresh) return

  const jobId = positiveId(contract.job.id)
  const freelancerId = positiveId(contract.freelancer.id)

  revalidatePath('/jobs')
  revalidatePath('/welcome')
  if (jobId) revalidatePath(`/jobs/${jobId}`)
  if (freelancerId) revalidatePath(`/profile/${freelancerId}`)
}
