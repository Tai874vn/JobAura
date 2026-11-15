import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { MyPostsPage } from '@/features/workspace/my-posts-page'

export const metadata: Metadata = { title: 'My portfolio posts' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <MyPostsPage />
    </RequireAuth>
  )
}
