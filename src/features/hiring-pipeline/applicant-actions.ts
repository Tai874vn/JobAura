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
