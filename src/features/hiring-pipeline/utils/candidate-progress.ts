/**
 * Pure helpers that compute a candidate's application progress tracker, action-needed state, next booked interview, and allowed dialogs.
 * Uses the application's status and event history to decide each tracker step and summary line.
 *
 * Calls: myApplicationsConfig; trackerStep
 * Used by:
 *   - features/hiring-pipeline/components/my-applications/my-application-list-item.tsx
 *   - features/hiring-pipeline/components/my-applications/my-application-panel.tsx
 */

import { myApplicationsConfig } from '@/features/hiring-pipeline/config/my-applications'
import type { ApplicationDetail, ApplicationEvent, ApplicationStatus, Interview } from '@/shared/schemas'
import { trackerStep } from '../api'

/** Set in src/features/hiring-pipeline/config/my-applications.ts (trackerLabels). */
export const trackerLabels = myApplicationsConfig.trackerLabels

/** done = passed, current = where the application is now, stopped = reached before it ended, todo = not reached. */
export type StepState = 'done' | 'current' | 'stopped' | 'todo'

export type TrackerView = {
  steps: { label: string; state: StepState }[]
  /** The sentence under the tracker for a finished application; null while it is still going. */
  line: string | null
  tone: 'good' | 'plain'
}

const inProgress: ApplicationStatus[] = ['APPLIED', 'REVIEWING', 'INTERVIEWING', 'OFFERED']

/**
 * How far an application got, read from its history: shortlisted is step 1, an interview request is step 2,
 * an offer is step 3. A list row has no history, so it reads 0 (only "Applied").
 */
export function furthestStep(events: Pick<ApplicationEvent, 'type'>[]): 0 | 1 | 2 | 3 {
  let reached: 0 | 1 | 2 | 3 = 0
  for (const { type } of events) {
    if (type === 'offer_sent') reached = 3
    else if (type === 'interview_requested' && reached < 2) reached = 2
    else if (type === 'shortlisted' && reached < 1) reached = 1
  }
  return reached
}

/** What the candidate's tracker draws (pure, so it is easy to test). */
export function trackerView(
  application: Pick<ApplicationDetail, 'status' | 'events'> & { statusReason?: string | null; statusNote?: string | null },
): TrackerView {
  const { status } = application
  const hired = status === 'HIRED'
  const stopped = !hired && !inProgress.includes(status)
  // A declined offer was an offer, so even without history it reached step 3.
  const at = stopped ? Math.max(furthestStep(application.events), trackerStep(status)) : trackerStep(status)
  const steps = trackerLabels.map((label, index) => {
    let state: StepState
    if (hired) state = 'done'
    else if (stopped) state = index <= at ? 'stopped' : 'todo'
    else state = index < at ? 'done' : index === at ? 'current' : 'todo'
    return { label, state }
  })

  let line: string | null = null
  if (hired) line = 'You are hired. The recruiter will be in touch about the next steps.'
  else if (status === 'REJECTED') {
    const why =
      application.statusReason === 'POSITION_FILLED' ? 'Position filled'
      : application.statusReason === 'POST_CLOSED' ? 'Post closed'
      : application.statusNote?.trim() || null
    line = why ? `Not selected · ${why}` : 'Not selected'
  } else if (status === 'DECLINED') line = 'Offer declined'
  else if (status === 'WITHDRAWN') line = 'You withdrew this application.'
  return { steps, line, tone: hired ? 'good' : 'plain' }
}

/** True when the candidate has something to do: an offer to answer, or an interview waiting for a time. */
export function needsAction(application: Pick<ApplicationDetail, 'status' | 'interviews'>): boolean {
  if (application.status === 'OFFERED') return true
  if (!inProgress.includes(application.status)) return false
  return application.interviews.some((interview) => interview.status === 'PROPOSED')
}

/** The booked time of the interview that is scheduled, or null. */
export function nextBooked(interviews: Pick<Interview, 'status' | 'scheduledAt'>[]): string | null {
  return interviews.find((interview) => interview.status === 'SCHEDULED' && interview.scheduledAt)?.scheduledAt ?? null
}

export type CandidateDialog = 'accept' | 'decline' | 'withdraw'

/** True while the application still allows what an open dialog does. If not, the dialog must close. */
export function candidateDialogAllowed(dialog: CandidateDialog, status: ApplicationStatus): boolean {
  if (dialog === 'withdraw') return inProgress.includes(status)
  return status === 'OFFERED'
}
