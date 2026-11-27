/**
 * Layout for pages under /profile. It wraps public profile routes in the shared site shell.
 *
 * Calls: PublicShell
 * Used by:
 *   - Next.js router: layout for /profile
 */

import { PublicShell } from '@/features/layout/components/public-shell'

// Layout for every page under /profile — renders <PublicShell> (features/layout/components/public-shell.tsx).
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
