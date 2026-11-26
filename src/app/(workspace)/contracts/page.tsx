import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { ContractsPage } from '@/features/contracts/components/contracts-page'
import { ContractsPageSkeleton } from '@/features/contracts/components/contracts-skeleton'

export const metadata: Metadata = { title: 'Contracts' }

// Page /contracts — renders <ContractsPage> (features/contracts/components/contracts-page.tsx); while loading: <ContractsPageSkeleton> (sign-in required).
// Page settings: src/features/contracts/config/contracts.ts
export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'employer', 'admin']} fallback={<ContractsPageSkeleton />}>
      <Suspense fallback={<ContractsPageSkeleton />}>
        <ContractsPage />
      </Suspense>
    </RequireAuth>
  )
}
