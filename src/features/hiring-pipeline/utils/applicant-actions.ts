/**
 * Pure helpers that decide which actions, dialogs, and outcome prompts a recruiter can use on an application.
 * Computes remaining post openings and matches the backend's allowed status transitions.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/hiring-pipeline/components/applicants/applicant-panel.tsx
 */

import type { ApplicationDetail, HiringPost } from '@/shared/schemas'

export type ApplicantAction =
  | 'shortlist'
  | 'requestInterview'
  | 'reject'
  | 'offer'
  | 'withdrawOffer'
  | 'nextRound'
  | 'message'

type PostNumbers = Pick<HiringPost, 'openings' | 'hiredCount' | 'offersWaiting'>

/** An interview that is still going on: waiting for a time, other times asked for, or booked. */
const activeInterview = (detail: Pick<ApplicationDetail, 'interviews'>) =>
  detail.interviews.some((i) => i.status === 'PROPOSED' || i.status === 'RESCHEDULE_REQUESTED' || i.status === 'SCHEDULED')

const doneInterview = (detail: Pick<ApplicationDetail, 'interviews'>) => detail.interviews.some((i) => i.status === 'COMPLETED')

/** How many openings are free (hired and waiting offers both use one). null means the post has no limit. */
export function openingsLeft(post: PostNumbers | undefined): number | null {
  if (!post || post.openings == null) return null
  return post.openings - (post.hiredCount ?? 0) - (post.offersWaiting ?? 0)
}

/** An offer would be allowed by the steps, but every opening is taken: the panel shows a sentence instead of the button. */
export function noOpeningsLeft(detail: Pick<ApplicationDetail, 'status' | 'interviews' | 'hiringPost'>, post?: PostNumbers): boolean {
  const left = openingsLeft(post ?? detail.hiringPost)
  return detail.status === 'INTERVIEWING' && !activeInterview(detail) && doneInterview(detail) && left !== null && left <= 0
}

/**
 * Which buttons the recruiter sees for one application. It follows the backend step table
 * (application-transitions.ts), so a button never shows for a step the server would refuse.
 * "message" is always last: the panel puts it in the header, not in the action bar.
 */
export function applicantActions(
  detail: Pick<ApplicationDetail, 'status' | 'interviews' | 'hiringPost'>,
  post?: PostNumbers,
): ApplicantAction[] {
  const steps = ((): ApplicantAction[] => {
    switch (detail.status) {
      case 'APPLIED':
        return ['shortlist', 'requestInterview', 'reject']
      case 'REVIEWING':
        return ['requestInterview', 'reject']
      case 'INTERVIEWING':
        if (activeInterview(detail)) return ['reject']
        if (doneInterview(detail)) return noOpeningsLeft(detail, post) ? ['nextRound', 'reject'] : ['offer', 'nextRound', 'reject']
        return ['requestInterview', 'reject']
      case 'OFFERED':
        return ['withdrawOffer']
      default:
        return []
    }
  })()
  return [...steps, 'message']
}

/** The dialogs the panel opens, each one the first step of an action. */
export type ApplicantDialog = 'reject' | 'offer' | 'withdraw-offer' | 'request'

const dialogNeeds: Record<ApplicantDialog, ApplicantAction[]> = {
  reject: ['reject'],
  offer: ['offer'],
  'withdraw-offer': ['withdrawOffer'],
  request: ['requestInterview', 'nextRound'],
}

/** True while the application still allows what an open dialog would do. If not, the dialog must close. */
export function dialogStillAllowed(dialog: ApplicantDialog, detail: Pick<ApplicationDetail, 'status' | 'interviews' | 'hiringPost'>): boolean {
  const actions = applicantActions(detail)
  return dialogNeeds[dialog].some((need) => actions.includes(need))
}

/** "How did it go?" is asked when the last interview is done and the recruiter has not decided yet. */
export function outcomeWanted(detail: Pick<ApplicationDetail, 'status' | 'interviews'>): boolean {
  return detail.status === 'INTERVIEWING' && !activeInterview(detail) && doneInterview(detail)
}
