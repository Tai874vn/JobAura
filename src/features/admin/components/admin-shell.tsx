'use client'

/**
 * Provides the page frame for the /admin area. It shows the left navigation sidebar, the administrator top bar, and the main content area.
 *
 * Calls: useSession
 * Used by:
 *   - app/(admin)/admin/layout.tsx
 */

import { BarChart3, BriefcaseBusiness, FileJson, Home, MessageSquare, Tags, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/features/auth/hooks/use-session'
import { cn } from '@/shared/lib/utils'
import { Avatar } from '@/shared/ui'

const nav = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/subcategories', label: 'Subcategories', icon: BarChart3 },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/settings?section=resume', activePath: '/settings', label: 'My resume', icon: FileJson },
]

/**
 * Frame of the admin pages: side menu (dashboard, jobs, users, categories, subcategories, comments, my resume)
 * and the top bar.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useSession()

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-border bg-surface">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link href="/" className="font-display text-2xl font-medium text-primary">
            JobAura
          </Link>
        </div>
        <nav className="grid gap-0.5 p-3">
          {nav.map(({ href, activePath, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground',
                pathname === (activePath ?? href) && 'bg-surface-muted text-foreground [&_svg]:text-primary'
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <section>
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
          <div>
            <p className="text-sm font-medium">Administration</p>
            <p className="text-sm text-muted">Manage marketplace records from the active section.</p>
          </div>
          <div className="ml-4 flex items-center gap-3">
            <span className="hidden text-right text-sm md:block">
              <strong className="block">{user?.name ?? 'Admin'}</strong>
              <span className="text-xs text-muted">Administrator</span>
            </span>
            <Avatar name={user?.name ?? 'Admin'} className="h-9 w-9" />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </section>
    </div>
  )
}
