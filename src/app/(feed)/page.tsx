import type { Metadata } from 'next'
import { FeedPage } from '@/features/feed/feed-page'

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
