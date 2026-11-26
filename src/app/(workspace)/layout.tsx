import type { Metadata } from 'next'
import { PublicShell } from '@/features/layout/components/public-shell'
import { WorkspaceRequireAuth } from '@/features/workspace/components/workspace-require-auth'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

// Layout for every page in app/(workspace)/ — renders <PublicShell> (features/layout/components/public-shell.tsx) (sign-in required).
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    // Keep the shared header and footer visible while RequireAuth checks the session.
    <PublicShell>
      <WorkspaceRequireAuth>{children}</WorkspaceRequireAuth>
    </PublicShell>
  )
}
