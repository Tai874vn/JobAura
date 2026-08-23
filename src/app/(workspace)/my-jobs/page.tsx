import { RequireAuth } from '@/features/auth/require-auth'
import { MyJobsPage } from '@/features/workspace/my-jobs-page'

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <MyJobsPage />
    </RequireAuth>
  )
}
