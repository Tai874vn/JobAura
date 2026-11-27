/**
 * Shared layout for all pages under /admin. Checks that the signed-in user is an admin before showing the admin shell, and displays a neutral skeleton while checking access.
 *
 * Calls: RequireAuth; AdminShell
 * Used by:
 *   - Next.js router: layout for /admin
 */

import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { AdminShell } from '@/features/admin/components/admin-shell'
import { Card, Skeleton } from '@/shared/ui'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

/** Neutral frame mirroring AdminShell without showing admin links before the admin role is confirmed. */
function AdminAccessSkeleton() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]" aria-hidden="true">
      <aside className="hidden border-r border-border bg-surface lg:block">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="grid gap-2 p-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      <div>
        <div className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-60 max-w-full" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="space-y-4 p-6">
          <Skeleton className="h-9 w-52" />
          <Card className="space-y-3 p-5">
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </div>
    </div>
  )
}

// Layout for every page under /admin — renders <AdminShell> (features/admin/components/admin-shell.tsx) (sign-in required).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth admin fallback={<AdminAccessSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  )
}
