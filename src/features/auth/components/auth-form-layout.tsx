'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getSignedInRedirect } from '@/shared/lib/roles'
import { ShortlistPreview } from '@/features/jobs/components/home/shortlist-preview'
import { Card, CardContent, Spinner } from '@/shared/ui'
import { useSession } from '../hooks/use-session'

export function AuthPageGate({ children, nextPath }: { children: React.ReactNode; nextPath?: string | null }) {
  const router = useRouter()
  const { user, isLoading } = useSession()

  useEffect(() => {
    if (!isLoading && user) router.replace(getSignedInRedirect(user, nextPath))
  }, [isLoading, nextPath, router, user])

  // Keeping guests unblocked here lets SSR and initial hydration show the static auth form
  // immediately without a spinner flash, while redirecting signed-in users once /api/auth/me confirms a live session.
  if (user) {
    return (
      <main className="flex min-h-screen items-center justify-center" aria-labelledby="auth-status-title">
        <h1 id="auth-status-title" className="sr-only">Redirecting to your workspace</h1>
        <Spinner className="h-7 w-7" />
        <span className="sr-only" role="status">Redirecting to your workspace</span>
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
            <Link href="/welcome" className="block text-center font-display text-xl font-medium text-primary">JobAura</Link>
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
