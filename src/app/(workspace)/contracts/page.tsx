import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { ContractsPage } from '@/features/contracts/contracts-page'

export const metadata: Metadata = { title: 'Contracts' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'employer', 'admin']}>
      <ContractsPage />
    </RequireAuth>
  )
}
