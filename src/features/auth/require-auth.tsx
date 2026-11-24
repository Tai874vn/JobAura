'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { canAccessRole, getSignedInRedirect, type AccountRole } from '@/shared/lib/roles'
import { buildLoginRedirect } from '@/shared/lib/session-routing'
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
  // Track the exact route we last redirected from so a layout-level RequireAuth
  // resets when the user moves to an allowed page and can redirect again later.
  const lastRedirectedPathRef = useRef<string | null>(null)
  const { user, isLoading } = useSession()
  const requiredRoles = admin ? (['admin'] as const) : allowedRoles
  const hasRequiredRole = canAccessRole(user?.role, requiredRoles)

  useEffect(() => {
    if (isLoading) return

    const search = typeof window !== 'undefined' ? window.location.search : ''
    const currentRoute = `${pathname}${search}`

    if (!user) {
      if (lastRedirectedPathRef.current === currentRoute) return
      lastRedirectedPathRef.current = currentRoute
      router.replace(anonymousRedirect ?? buildLoginRedirect(pathname, search))
      return
    }

    if (!hasRequiredRole) {
      if (lastRedirectedPathRef.current === currentRoute) return
      lastRedirectedPathRef.current = currentRoute
      router.replace(getSignedInRedirect(user))
      return
    }

    lastRedirectedPathRef.current = null
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
