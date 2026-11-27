/**
 * Small status badge for a job application in the hiring pipeline.
 * Maps each application status to a color tone and displays viewer-specific text such as "Offer received" or "Position filled".
 *
 * Calls: statusLabel
 * Used by:
 *   - features/hiring-pipeline/components/applicants/applicant-list-item.tsx
 *   - features/hiring-pipeline/components/applicants/applicant-panel.tsx
 *   - features/hiring-pipeline/components/my-applications/my-application-list-item.tsx
 *   - features/hiring-pipeline/components/my-applications/my-application-panel.tsx
 *   - features/hiring/components/detail/applied-action.tsx
 */

import type { ApplicationStatus } from '@/shared/schemas'
import { Badge } from '@/shared/ui'
import { statusLabel } from '../api'

const tones: Record<ApplicationStatus, 'neutral' | 'primary' | 'danger'> = {
  APPLIED: 'neutral',
  REVIEWING: 'primary',
  INTERVIEWING: 'primary',
  OFFERED: 'primary',
  HIRED: 'primary',
  REJECTED: 'danger',
  DECLINED: 'neutral',
  WITHDRAWN: 'neutral',
}

/** The small status chip. The words come from `statusLabel`, so a swept application reads "Position filled". */
export function StatusBadge({
  status,
  viewer,
  reason,
}: {
  status: ApplicationStatus
  viewer: 'recruiter' | 'candidate'
  reason?: string | null
}) {
  return <Badge tone={tones[status]}>{statusLabel(status, viewer, reason)}</Badge>
}
