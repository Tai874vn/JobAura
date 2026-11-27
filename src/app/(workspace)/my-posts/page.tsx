/**
 * Candidate portfolio posts management page at /my-posts. Lets signed-in candidates and admins view and manage their own portfolio posts.
 *
 * Calls: RequireAuth; MyPostsPage
 * Used by:
 *   - Next.js router: page for /my-posts
 */

import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { MyPostsPage } from '@/features/workspace/components/my-posts-page'

export const metadata: Metadata = { title: 'My portfolio posts' }

// Page /my-posts — renders <MyPostsPage> (features/workspace/components/my-posts-page.tsx) (sign-in required).
// Page settings: src/features/workspace/config/my-posts.ts
export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <MyPostsPage />
    </RequireAuth>
  )
}
