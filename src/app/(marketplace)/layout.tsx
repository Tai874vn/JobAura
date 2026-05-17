import { ChatShell } from '@/features/chat/chat-shell'
import { Footer } from '@/features/layout/footer'
import { SiteHeader } from '@/features/layout/site-header'

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatShell />
    </div>
  )
}
