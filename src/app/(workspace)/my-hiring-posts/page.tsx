/**
 * Employer hiring posts management page at /my-hiring-posts. Lets signed-in employers and admins view and manage their own hiring posts, with a skeleton fallback while loading.
 *
 * Calls: RequireAuth; MyHiringPostsPage; MyHiringPostsPageSkeleton
 * Used by:
 *   - Next.js router: page for /my-hiring-posts
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { MyHiringPostsPage } from '@/features/hiring/components/my-posts/my-hiring-posts-page'
import { MyHiringPostsPageSkeleton } from '@/features/hiring/components/browse/hiring-posts-skeleton'

export const metadata: Metadata = { title: 'My hiring posts' }

// Page /my-hiring-posts — renders <MyHiringPostsPage> (features/hiring/components/my-posts/my-hiring-posts-page.tsx); while loading: <MyHiringPostsPageSkeleton> (sign-in required).
// Page settings: src/features/hiring/config/my-hiring-posts.ts
export default function Page() {
  return (
    <RequireAuth allowedRoles={['employer', 'admin']} fallback={<MyHiringPostsPageSkeleton />}>
      <Suspense fallback={<MyHiringPostsPageSkeleton />}>
        <MyHiringPostsPage />
      </Suspense>
    </RequireAuth>
  )
}
