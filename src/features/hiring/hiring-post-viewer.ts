import type { HiringPostViewer } from './hiring-post-card'

/** Candidates (role `user`) apply; recruiters and admins read; anyone signed out is a visitor. */
export function hiringPostViewer(role?: string | null): HiringPostViewer {
  if (role === 'user') return 'candidate'
  if (role === 'employer' || role === 'admin') return 'recruiter'
  return 'visitor'
}
