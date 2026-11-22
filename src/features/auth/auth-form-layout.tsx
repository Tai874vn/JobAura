'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'
import { getSignedInRedirect } from '@/shared/lib/roles'
import { ShortlistPreview } from '@/features/jobs/home/shortlist-preview'
import { Card, CardContent, Spinner } from '@/shared/ui'
import { useSession } from './use-session'

const subscribeNever = () => () => {}

export function AuthPageGate({ children, nextPath }: { children: React.ReactNode; nextPath?: string | null }) {
  const router = useRouter()
  const { user, isLoading } = useSession()
  // The server always renders the "checking" state. This page sits in a Suspense boundary that hydrates after
  // the header has already asked who is signed in, so render that same state until hydration ends.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)

  useEffect(() => {
    if (!isLoading && user) router.replace(getSignedInRedirect(user, nextPath))
  }, [isLoading, nextPath, router, user])

  if (!hydrated || isLoading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center" aria-labelledby="auth-status-title">
        <h1 id="auth-status-title" className="sr-only">Checking authentication</h1>
        <Spinner className="h-7 w-7" />
        <span className="sr-only" role="status">Checking authentication</span>
      </main>
    )
  }

  return <>{children}</>
}

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md rounded-2xl shadow-float">
          <CardContent className="p-8">
            <Link href="/" className="block text-center font-display text-xl font-medium text-primary">JobAura</Link>
            <h1 className="mt-6 text-center font-display text-2xl font-medium">{title}</h1>
            <div className="mt-6">{children}</div>
          </CardContent>
        </Card>
      </div>
      <aside aria-label="What JobAura does" className="hidden border-l border-border bg-surface-muted lg:flex lg:items-center lg:justify-center lg:px-12">
        <div className="w-full max-w-md">
          <p className="font-display text-2xl font-medium">Every hiring post gets a ranked shortlist</p>
          <p className="mt-3 text-sm leading-6 text-muted">Candidates are compared on four points: occupation, years in it, resume skills, and the level read from their work.</p>
          <ShortlistPreview rows={3} className="mt-8" />
        </div>
      </aside>
    </main>
  )
}

export function FieldError({ children, message, label }: { children: React.ReactNode; message?: string; label?: string }) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-medium">{label}</span> : null}
      {children}
      {message ? <span className="mt-1 block text-xs font-medium text-danger">{message}</span> : null}
    </label>
  )
}
