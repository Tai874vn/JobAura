import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { Footer } from '@/features/layout/footer'
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
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        <Footer />
      </div>
    </RequireAuth>
  )
}
