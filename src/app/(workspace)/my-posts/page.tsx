import { RequireAuth } from '@/features/auth/require-auth'
import { MyPostsPage } from '@/features/workspace/my-posts-page'

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <MyPostsPage />
    </RequireAuth>
  )
}
