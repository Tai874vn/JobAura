import type { Job } from '@/shared/schemas'

export function getUserPosts(jobs: Job[], userId: number | undefined) {
  if (!userId) return []

  return jobs
    .filter((job) => job.creatorId === userId || job.user?.id === userId)
    .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
}

function getTime(value?: string) {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}
