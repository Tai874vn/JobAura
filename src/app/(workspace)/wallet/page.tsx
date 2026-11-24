import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { WalletPage } from '@/features/wallet/wallet-page'

export const metadata: Metadata = { title: 'Wallet' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'employer', 'admin']}>
      <WalletPage />
    </RequireAuth>
  )
}
