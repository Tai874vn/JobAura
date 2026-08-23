'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { canAccessRole, type AccountRole } from '@/shared/lib/roles'
import { Spinner } from '@/shared/ui'
import { useSession } from './use-session'

export function RequireAuth({
  children,
  admin = false,
  allowedRoles,
  anonymousRedirect,
}: {
  children: React.ReactNode
  admin?: boolean
  allowedRoles?: readonly AccountRole[]
  anonymousRedirect?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const hasRedirectedRef = useRef(false)
  const { user, isLoading } = useSession()
  const requiredRoles = admin ? (['admin'] as const) : allowedRoles
  const hasRequiredRole = canAccessRole(user?.role, requiredRoles)

  useEffect(() => {
    if (isLoading || hasRedirectedRef.current) return

    if (!user) {
      hasRedirectedRef.current = true
      router.replace(anonymousRedirect ?? `/auth/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (!hasRequiredRole) {
      hasRedirectedRef.current = true
      router.replace('/')
    }
  }, [anonymousRedirect, hasRequiredRole, isLoading, pathname, router, user])

  if (isLoading || !user || !hasRequiredRole) {
    return (
      <main className="flex min-h-screen items-center justify-center" aria-labelledby="auth-status-title">
        <h1 id="auth-status-title" className="sr-only">Checking access</h1>
        <Spinner className="h-7 w-7" />
        <span className="sr-only" role="status">Checking access</span>
      </main>
    )
  }

  return <>{children}</>
}
