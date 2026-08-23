import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { SiteHeader } from '@/features/layout/site-header'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth allowedRoles={['user', 'admin']} anonymousRedirect="/welcome">
      <SiteHeader />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </RequireAuth>
  )
}
