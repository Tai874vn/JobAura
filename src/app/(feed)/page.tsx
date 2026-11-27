/**
 * Signed-in home feed page at /. Shows the personalized workspace feed for candidates and admins.
 *
 * Calls: FeedPage
 * Used by:
 *   - Next.js router: page for /
 */

import type { Metadata } from 'next'
import { FeedPage } from '@/features/feed/components/feed-page'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your personalized JobAura workspace feed.',
  robots: {
    index: false,
    follow: false,
  },
}

// FeedLayout's RequireAuth already restricts "/" to candidates and admins (employers redirect to /my-hiring-posts),
// so this page renders FeedPage directly without a dynamic(..., { ssr: false }) waterfall.
export default function Page() {
  return <FeedPage />
}
