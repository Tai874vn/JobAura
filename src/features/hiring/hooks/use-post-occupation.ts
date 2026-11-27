'use client'

/**
 * Returns the occupation display label for a hiring post card. If the post has an occupation code without a title, it fetches the title from the occupation catalogue.
 *
 * Calls: useOccupationTitle; postOccupation
 * Used by:
 *   - features/feed/components/jobs-for-you.tsx
 *   - features/hiring/components/browse/hiring-post-card.tsx
 *   - features/hiring/components/browse/hiring-post-result-card.tsx
 *   - features/hiring/components/my-posts/my-hiring-post-result-card.tsx
 */

import { useOccupationTitle } from '@/features/occupations/components/occupation-picker'
import type { HiringPost } from '@/shared/schemas'
import { postOccupation } from '../utils/hiring-post-form'

/**
 * The post's occupation label for a card. When the response has the code but no title (recommendations saved in
 * the cache or a snapshot before titles were added), the title is loaded from the catalogue, cached per code.
 */
export function usePostOccupation(post: Pick<HiringPost, 'occupationCode' | 'occupationTitle' | 'legacyField'>) {
  const fetched = useOccupationTitle(post.occupationTitle ? '' : (post.occupationCode ?? ''))
  return postOccupation(post, fetched)
}
