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
