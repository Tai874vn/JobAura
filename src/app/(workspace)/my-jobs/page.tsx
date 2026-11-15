import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { MyJobsPage } from '@/features/workspace/my-jobs-page'

export const metadata: Metadata = { title: 'My hired jobs' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <MyJobsPage />
    </RequireAuth>
  )
}
