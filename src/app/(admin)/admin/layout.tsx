import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { AdminShell } from '@/features/admin/admin-shell'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth admin>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  )
}
