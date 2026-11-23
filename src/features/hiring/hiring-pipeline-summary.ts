import type { HiringPost } from '@/shared/schemas'

type Counts = NonNullable<HiringPost['pipeline']>

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * The line on a recruiter's post card, from the owner's `pipeline` numbers:
 * "3 new · 1 interview · 1 offer · 1 of 2 filled". Parts that are zero are left out. A post with no limit
 * (`openings: null`) says "<n> hired" instead of "x of y filled". Empty when the card has no `pipeline`.
 */
export function pipelineSummary(post: Pick<HiringPost, 'openings' | 'hiredCount' | 'pipeline'>): string {
  const counts = post.pipeline
  if (!counts) return ''
  const hired = post.hiredCount ?? counts.HIRED
  const parts: string[] = []
  if (counts.APPLIED) parts.push(`${counts.APPLIED} new`)
  if (counts.REVIEWING) parts.push(`${counts.REVIEWING} shortlisted`)
  if (counts.INTERVIEWING) parts.push(plural(counts.INTERVIEWING, 'interview', 'interviews'))
  if (counts.OFFERED) parts.push(plural(counts.OFFERED, 'offer', 'offers'))
  if (post.openings == null) {
    if (hired) parts.push(`${hired} hired`)
  } else {
    parts.push(`${hired} of ${post.openings} filled`)
  }
  return parts.join(' · ')
}

/** People still moving through the pipeline: new, shortlisted, interview and offer (not the hired). */
export function activeApplicationCount(counts: Counts | undefined): number {
  if (!counts) return 0
  return counts.APPLIED + counts.REVIEWING + counts.INTERVIEWING + counts.OFFERED
}

/** The question before closing a post; it says how many people will be told the post is closed. */
export function closePostQuestion(inProgress: number): string {
  if (inProgress <= 0) return 'Close this post?'
  return `Close this post? ${plural(inProgress, 'person', 'people')} still in progress will be told it is closed.`
}
