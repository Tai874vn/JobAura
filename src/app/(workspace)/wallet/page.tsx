/**
 * Wallet page (/wallet) in the workspace.
 * Checks that the user is signed in, then shows their wallet balance and transactions.
 *
 * Calls: RequireAuth; WalletPage
 * Used by:
 *   - Next.js router: page for /wallet
 */

import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { WalletPage } from '@/features/wallet/components/wallet-page'

export const metadata: Metadata = { title: 'Wallet' }

// Page /wallet — renders <WalletPage> (features/wallet/components/wallet-page.tsx) (sign-in required).
// Page settings: src/features/wallet/config/wallet.ts
export default function Page() {
  return (
    <RequireAuth allowedRoles={['user', 'employer', 'admin']}>
      <WalletPage />
    </RequireAuth>
  )
}
