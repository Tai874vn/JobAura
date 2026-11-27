/**
 * Shared page frame for public and workspace layouts. Wraps each page with the site header at the top and the footer at the bottom.
 *
 * Calls: SiteHeader; Footer
 * Used by:
 *   - app/(marketplace)/layout.tsx
 *   - app/(workspace)/layout.tsx
 *   - app/jobs/layout.tsx
 *   - app/profile/layout.tsx
 */

import { Footer } from './footer'
import { SiteHeader } from './site-header'

/**
 * Header + page + footer frame used by the public and workspace pages.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex min-w-0 flex-1 flex-col max-sm:pb-[4.5rem]">{children}</main>
      <Footer />
    </div>
  )
}
