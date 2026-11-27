/**
 * Shared layout for all pages under /jobs.
 * Wraps job and service pages inside the public site shell.
 *
 * Calls: PublicShell
 * Used by:
 *   - Next.js router: layout for /jobs
 */

import { PublicShell } from '@/features/layout/components/public-shell'

// Layout for every page under /jobs — renders <PublicShell> (features/layout/components/public-shell.tsx).
export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
