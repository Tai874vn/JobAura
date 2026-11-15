'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { useSession } from '@/features/auth/use-session'
import { footerColumns } from './footer-links'

const subscribeNever = () => () => {}

export function Footer() {
  const { user, isLoading } = useSession()
  // The server can't know who is signed in, so it renders the neutral links; the client switches after hydration.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)
  const columns = footerColumns(!hydrated || isLoading ? 'loading' : user?.role ?? null)

  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-8 py-10 md:grid-cols-4">
        <div>
          <Link href={hydrated && user ? '/' : '/welcome'} className="font-display text-2xl font-bold text-primary">
            JobAura
          </Link>
          <p className="mt-3 text-sm text-muted">Find a role, show your work, or hire the right person, with AI matching built in.</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-bold">{column.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
