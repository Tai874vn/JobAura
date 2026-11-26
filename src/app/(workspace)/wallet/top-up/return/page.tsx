import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { TopUpReturn } from '@/features/wallet/top-up-return'

export const metadata: Metadata = { title: 'Top up result' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'employer', 'admin']}>
      <TopUpReturn />
    </RequireAuth>
  )
}
