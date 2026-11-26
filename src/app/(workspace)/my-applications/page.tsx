import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/require-auth'
import { MyApplicationsPage } from '@/features/hiring-pipeline/components/my-applications/my-applications-page'
import { MyApplicationsPageSkeleton } from '@/features/hiring-pipeline/components/split-pane-skeletons'

export const metadata: Metadata = { title: 'My applications' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']} fallback={<MyApplicationsPageSkeleton />}>
      <Suspense fallback={<MyApplicationsPageSkeleton />}>
        <MyApplicationsPage />
      </Suspense>
    </RequireAuth>
  )
}
