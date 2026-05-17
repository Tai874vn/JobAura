import { RequireAuth } from '@/features/auth/require-auth'
import { ChatShell } from '@/features/chat/chat-shell'
import { SiteHeader } from '@/features/layout/site-header'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <SiteHeader />
      <main className="min-h-screen">{children}</main>
      <ChatShell />
    </RequireAuth>
  )
}
