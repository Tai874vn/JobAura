import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { PublicShell } from '@/features/layout/public-shell'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PublicShell>{children}</PublicShell>
    </RequireAuth>
  )
}
