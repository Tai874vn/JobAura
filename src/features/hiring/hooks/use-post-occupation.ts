'use client'

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
