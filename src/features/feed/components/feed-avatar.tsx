/**
 * Clickable user avatar used across the feed, connections, and candidate pages.
 * Renders the user's avatar linked to their profile page.
 *
 * Calls: Avatar
 * Used by:
 *   - 8 files, for example features/candidates/components/recommended-candidates/candidate-results-panel.tsx, features/connections/components/connections-page.tsx, features/feed/components/feed-left-rail.tsx
 */

import Link from 'next/link'
import { Avatar } from '@/shared/ui'

export function FeedAvatar({
  user,
  size = 'md',
}: {
  user: { id: number; name: string; avatar?: string | null }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  return (
    <Link href={`/profile/${user.id}`} className="shrink-0" aria-label={`View ${user.name}'s profile`}>
      <Avatar name={user.name} src={user.avatar} size={size} />
    </Link>
  )
}
