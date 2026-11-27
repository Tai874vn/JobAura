/**
 * Shared layout for public marketplace pages. Wraps child pages in the standard public header and footer shell.
 *
 * Calls: PublicShell
 * Used by:
 *   - Next.js router: layout for /
 */

import { PublicShell } from '@/features/layout/components/public-shell'

// Layout for every page in app/(marketplace)/ — renders <PublicShell> (features/layout/components/public-shell.tsx).
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
