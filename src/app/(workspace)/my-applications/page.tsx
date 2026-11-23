import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { MyApplicationsPage } from '@/features/hiring-pipeline/my-applications-page'

export const metadata: Metadata = { title: 'My applications' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <MyApplicationsPage />
    </RequireAuth>
  )
}
