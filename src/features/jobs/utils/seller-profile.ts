/**
 * Small helpers that read the seller's ID, profile link, display name, and avatar URL from a Job object.
 * Provides safe fallbacks when user details are missing.
 *
 * Calls: nothing from this project
 * Used by:
 *   - app/jobs/[id]/page.tsx
 *   - features/jobs/components/browse/job-card.tsx
 *   - features/jobs/components/browse/job-result-card.tsx
 *   - features/jobs/components/detail/job-detail-view.tsx
 *   - features/jobs/utils/jobs-browse-view.ts
 */

import type { Job } from '@/shared/schemas'

export function getSellerId(job: Job) {
  return job.user?.id ?? job.creatorId
}

export function getSellerHref(job: Job) {
  const sellerId = getSellerId(job)
  return sellerId ? `/profile/${sellerId}` : undefined
}

export function getSellerName(job: Job) {
  return job.user?.name?.trim() || 'JobAura seller'
}

export function getSellerAvatar(job: Job) {
  return job.user?.avatar?.trim() || undefined
}
