import type { Job } from '@/shared/schemas'

export function getSellerId(job: Job) {
  return job.nguoiDung?.id ?? job.nguoiTao
}

export function getSellerHref(job: Job) {
  const sellerId = getSellerId(job)
  return sellerId ? `/profile/${sellerId}` : undefined
}

export function getSellerName(job: Job) {
  return job.nguoiDung?.name?.trim() || 'JobAura seller'
}

export function getSellerAvatar(job: Job) {
  return job.nguoiDung?.avatar?.trim() || undefined
}
