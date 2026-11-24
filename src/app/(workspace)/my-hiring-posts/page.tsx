import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/require-auth'
import { MyHiringPostsPage } from '@/features/hiring/my-hiring-posts-page'
import { MyHiringPostsPageSkeleton } from '@/features/hiring/hiring-posts-skeleton'

export const metadata: Metadata = { title: 'My hiring posts' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['employer', 'admin']} fallback={<MyHiringPostsPageSkeleton />}>
      <Suspense fallback={<MyHiringPostsPageSkeleton />}>
        <MyHiringPostsPage />
      </Suspense>
    </RequireAuth>
  )
}
