import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { WalletPage } from '@/features/wallet/components/wallet-page'

export const metadata: Metadata = { title: 'Wallet' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'employer', 'admin']}>
      <WalletPage />
    </RequireAuth>
  )
}
