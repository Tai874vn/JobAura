import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { MyApplicationsPage } from '@/features/hiring-pipeline/components/my-applications/my-applications-page'
import { MyApplicationsPageSkeleton } from '@/features/hiring-pipeline/components/split-pane-skeletons'

export const metadata: Metadata = { title: 'My applications' }

// Page /my-applications — renders <MyApplicationsPage> (features/hiring-pipeline/components/my-applications/my-applications-page.tsx); while loading: <MyApplicationsPageSkeleton> (sign-in required).
// Page settings: src/features/hiring-pipeline/config/my-applications.ts
export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']} fallback={<MyApplicationsPageSkeleton />}>
      <Suspense fallback={<MyApplicationsPageSkeleton />}>
        <MyApplicationsPage />
      </Suspense>
    </RequireAuth>
  )
}
