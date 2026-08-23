'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getSignedInRedirect } from '@/shared/lib/roles'
import { Card, CardContent, Spinner } from '@/shared/ui'
import { useSession } from './use-session'

export function AuthPageGate({ children, nextPath }: { children: React.ReactNode; nextPath?: string | null }) {
  const router = useRouter()
  const { user, isLoading } = useSession()

  useEffect(() => {
    if (!isLoading && user) router.replace(getSignedInRedirect(user, nextPath))
  }, [isLoading, nextPath, router, user])

  if (isLoading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background" aria-labelledby="auth-status-title">
        <h1 id="auth-status-title" className="sr-only">Checking authentication</h1>
        <Spinner className="h-7 w-7" />
        <span className="sr-only" role="status">Checking authentication</span>
      </main>
    )
  }

  return <>{children}</>
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
        <CardContent className="p-6">
          <Link href="/" className="mb-8 inline-block font-display text-2xl font-bold text-primary">JobAura</Link>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mb-6 mt-2 text-sm text-muted">{subtitle}</p>
          {children}
        </CardContent>
      </Card>
    </main>
  )
}

export function FieldError({ children, message }: { children: React.ReactNode; message?: string }) {
  return <label className="block">{children}{message ? <span className="mt-1 block text-xs font-medium text-danger">{message}</span> : null}</label>
}
