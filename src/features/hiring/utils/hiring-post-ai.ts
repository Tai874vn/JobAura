/**
 * Reads the AI seniority queue status on a hiring post for the My hiring posts page. Computes whether scoring is still running and which status text, error message, and action button to show.
 *
 * Calls: sanitizeUserMessage
 * Used by:
 *   - features/hiring/components/my-posts/my-hiring-post-result-card.tsx
 *   - features/hiring/components/my-posts/my-hiring-posts-page.tsx
 */

import { sanitizeUserMessage } from '@/shared/lib/errors'
import type { HiringPost } from '@/shared/schemas'

/**
 * The backend works out a hiring post's AI level in a queue, like resumes. These read the queue state saved on
 * the post, for the recruiter's "My hiring posts" page.
 */
export function isHiringPostAiPending(post: Pick<HiringPost, 'aiStatus'>) {
  return post.aiStatus === 'QUEUED' || post.aiStatus === 'PROCESSING'
}

/** What to show next to the level: a short status, an optional message, and which button fits. */
export function hiringPostAiState(post: Pick<HiringPost, 'aiStatus' | 'aiStatusMessage' | 'predictedSeniority'>) {
  if (isHiringPostAiPending(post)) return { label: 'Working out the AI level…', message: null, action: null }
  if (post.aiStatus === 'AI_UNAVAILABLE' || post.aiStatus === 'FAILED') {
    return {
      label: null,
      message: sanitizeUserMessage(post.aiStatusMessage, 'The AI level could not be worked out.'),
      action: 'Try again' as const,
    }
  }
  if (post.aiStatus === 'NEEDS_INPUT') {
    return {
      label: null,
      message: sanitizeUserMessage(post.aiStatusMessage, 'Add the field and required years to get an AI level.'),
      action: null,
    }
  }
  return { label: null, message: null, action: post.predictedSeniority ? null : ('Get AI level' as const) }
}
