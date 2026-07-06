import { RequireAuth } from '@/features/auth/require-auth'
import { Footer } from '@/features/layout/footer'
import { SiteHeader } from '@/features/layout/site-header'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </RequireAuth>
  )
}
