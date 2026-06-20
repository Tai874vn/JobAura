import { RequireAuth } from '@/features/auth/require-auth'
import { SiteHeader } from '@/features/layout/site-header'

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth anonymousRedirect="/welcome">
      <SiteHeader />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </RequireAuth>
  )
}
