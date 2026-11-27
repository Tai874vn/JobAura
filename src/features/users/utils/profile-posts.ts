/**
 * Helper for the public profile page (/profile/[id]). Filters a list of portfolio posts down to those created by a given user and sorts them newest first.
 *
 * Calls: nothing from this project
 * Used by:
 *   - app/profile/[id]/page.tsx
 */

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
