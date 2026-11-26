import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { MyPostsPage } from '@/features/workspace/components/my-posts-page'

export const metadata: Metadata = { title: 'My portfolio posts' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <MyPostsPage />
    </RequireAuth>
  )
}
