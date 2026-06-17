import { RequireAuth } from '@/features/auth/require-auth'
import { SiteHeader } from '@/features/layout/site-header'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <SiteHeader />
      <main className="min-h-screen">{children}</main>
    </RequireAuth>
  )
}
