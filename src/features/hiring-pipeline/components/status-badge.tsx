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
