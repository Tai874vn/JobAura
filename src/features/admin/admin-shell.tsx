'use client'

import { BarChart3, BriefcaseBusiness, FileJson, Home, MessageSquare, Settings, Tags, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, initials } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'

const nav = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/job-types', label: 'Job types', icon: Tags },
  { href: '/admin/job-detail-types', label: 'Detail types', icon: BarChart3 },
  { href: '/admin/hired-jobs', label: 'Hired jobs', icon: Settings },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/settings?section=resume', activePath: '/settings', label: 'My resume', icon: FileJson },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-border bg-white">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link href="/" className="font-display text-2xl font-bold text-primary">
            JobAura
          </Link>
        </div>
        <nav className="grid gap-1 p-3">
          {nav.map(({ href, activePath, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground',
                pathname === (activePath ?? href) && 'bg-primary text-white hover:bg-primary hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <section>
        <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
          <input className="h-10 w-full max-w-md rounded-lg border border-border px-3 text-sm outline-none focus:border-primary" placeholder="Search admin..." />
          <div className="ml-4 flex items-center gap-3">
            <span className="hidden text-right text-sm md:block">
              <strong className="block">{user?.name ?? 'Admin'}</strong>
              <span className="text-xs text-muted">Administrator</span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {initials(user?.name)}
            </span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </section>
    </div>
  )
}
