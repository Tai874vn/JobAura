import type { HiringPostViewer } from './hiring-post-card'

/** Candidates (role `user`) and admins (who use the site like a normal user) apply; recruiters read; anyone signed out is a visitor. */
// @find shared hiring-posts viewer-role access [all] — user/admin → candidate, employer → recruiter, signed out → visitor
export function hiringPostViewer(role?: string | null): HiringPostViewer {
  if (role === 'user' || role === 'admin') return 'candidate'
  if (role === 'employer') return 'recruiter'
  return 'visitor'
}
