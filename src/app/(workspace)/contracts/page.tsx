import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { ContractsPage } from '@/features/contracts/components/contracts-page'
import { ContractsPageSkeleton } from '@/features/contracts/components/contracts-skeleton'

export const metadata: Metadata = { title: 'Contracts' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'employer', 'admin']} fallback={<ContractsPageSkeleton />}>
      <Suspense fallback={<ContractsPageSkeleton />}>
        <ContractsPage />
      </Suspense>
    </RequireAuth>
  )
}
