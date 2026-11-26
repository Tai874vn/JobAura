import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { TopUpReturn } from '@/features/wallet/components/top-up-return'

export const metadata: Metadata = { title: 'Top up result' }

// Page /wallet/top-up/return — renders <TopUpReturn> (features/wallet/components/top-up-return.tsx) (sign-in required).
export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'employer', 'admin']}>
      <TopUpReturn />
    </RequireAuth>
  )
}
