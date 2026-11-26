'use client'


import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'

const subscribeNever = () => () => {}

export function Footer() {
  const { user, isLoading } = useSession()
  // The server can't know who is signed in, so it renders the neutral links; the client switches after hydration.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)
  const columns = footerColumns(!hydrated || isLoading ? 'loading' : user?.role ?? null)

  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="container-page grid grid-cols-1 gap-10 py-14 sm:grid-cols-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="sm:col-span-3 md:col-span-1">
          <Link href={hydrated && user ? '/' : '/welcome'} className="font-display text-xl font-medium text-primary">
            JobAura
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">Find a role, show your work, or hire the right person, with AI matching built in.</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-medium text-foreground">{column.title}</h2>
            <ul className="mt-3 grid gap-1 text-sm text-muted">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="inline-flex min-h-8 items-center transition-colors hover:text-primary">
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

type FooterColumn = { title: string; links: Array<{ label: string; href: string }> }

const about: FooterColumn = {
  title: 'JobAura',
  links: [
    { label: 'About JobAura', href: '/welcome' },
    { label: 'How it works', href: '/welcome#how-it-works' },
    { label: 'FAQ', href: '/welcome#faq' },
  ],
}

/** Footer links for the viewer: signed-in people get their own shortcuts, never "Sign in". */
export function footerColumns(role: string | null | 'loading'): FooterColumn[] {
  if (role === 'user') {
    return [
      { title: 'Find work', links: [
        { label: 'Hiring posts', href: '/hiring-posts' },
        { label: 'Roles for you', href: '/recommendations/jobs' },
        { label: 'Your resume', href: '/settings?section=resume' },
      ] },
      { title: 'Show your work', links: [
        { label: 'Post portfolio', href: '/jobs/new' },
        { label: 'My portfolio posts', href: '/my-posts' },
        { label: 'Browse portfolios', href: '/jobs' },
      ] },
      about,
    ]
  }
  if (role === 'employer' || role === 'admin') {
    return [
      { title: 'Hire', links: [
        { label: 'My hiring posts', href: '/my-hiring-posts' },
        { label: 'Find candidates', href: '/candidates' },
        { label: 'AI matching', href: '/recommendations/candidates' },
      ] },
      { title: 'Browse', links: [
        { label: 'Hiring posts', href: '/hiring-posts' },
        { label: 'Portfolios', href: '/jobs' },
      ] },
      about,
    ]
  }
  // Visitors, and the brief moment before the session is known (only links that suit everyone).
  const visitor = role !== 'loading'
  return [
    { title: 'For candidates', links: [
      { label: 'Hiring posts', href: '/hiring-posts' },
      ...(visitor ? [{ label: 'Create a candidate account', href: '/auth/register' }] : []),
    ] },
    { title: 'For recruiters', links: [
      { label: 'Browse portfolios', href: '/jobs' },
      ...(visitor ? [{ label: 'Create a recruiter account', href: '/auth/register' }, { label: 'Sign in', href: '/auth/login' }] : []),
    ] },
    about,
  ]
}
