/**
 * Maps a signed-in user's role to a hiring post viewer type (candidate, recruiter, or visitor). Used by hiring post browse and detail pages to decide which actions to show.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/hiring/components/browse/hiring-posts-page.tsx
 *   - features/hiring/components/detail/hiring-post-detail-view.tsx
 */

import type { HiringPostViewer } from '../components/browse/hiring-post-card'

/** Candidates (role `user`) and admins (who use the site like a normal user) apply; recruiters read; anyone signed out is a visitor. */
// @find shared hiring-posts viewer-role access [all] — user/admin → candidate, employer → recruiter, signed out → visitor
export function hiringPostViewer(role?: string | null): HiringPostViewer {
  if (role === 'user' || role === 'admin') return 'candidate'
  if (role === 'employer') return 'recruiter'
  return 'visitor'
}
