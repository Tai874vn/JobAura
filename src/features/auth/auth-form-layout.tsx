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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
        <CardContent className="p-7 pt-8">
          <div className="mb-6 flex flex-col items-center gap-1.5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-white">JA</span>
            <Link href="/" className="font-display text-[22px] font-bold tracking-tight text-primary">JobAura</Link>
          </div>
          <h1 className="text-center font-display text-2xl font-bold tracking-tight">{title}</h1>
          <div className="mt-6">{children}</div>
        </CardContent>
      </Card>
    </main>
  )
}

export function FieldError({ children, message, label }: { children: React.ReactNode; message?: string; label?: string }) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-[12.5px] font-semibold">{label}</span> : null}
      {children}
      {message ? <span className="mt-1 block text-xs font-medium text-danger">{message}</span> : null}
    </label>
  )
}
