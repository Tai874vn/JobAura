import { Footer } from './footer'
import { SiteHeader } from './site-header'

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  )
}
