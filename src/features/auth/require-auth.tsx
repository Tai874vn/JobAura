'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { canAccessRole, getSignedInRedirect, type AccountRole } from '@/shared/lib/roles'
import { buildLoginRedirect } from '@/shared/lib/session-routing'
import { Card, Skeleton } from '@/shared/ui'
import { useSession } from './use-session'

export function RequireAuth({
  children,
  admin = false,
  allowedRoles,
  anonymousRedirect,
  fallback,
}: {
  children: React.ReactNode
  admin?: boolean
  allowedRoles?: readonly AccountRole[]
  anonymousRedirect?: string
  /** Optional layout-matching skeleton shown while access is checked. */
  fallback?: React.ReactNode
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
    if (fallback) {
      return (
        <div className="flex min-h-0 flex-1 flex-col" role="status" aria-label="Checking access" aria-busy="true">
          <span className="sr-only">Checking access</span>
          {fallback}
        </div>
      )
    }

    return (
      <div className="container-page flex-1 py-8 sm:py-10" role="status" aria-label="Checking access" aria-busy="true">
        <span className="sr-only">Checking access</span>
        <Skeleton className="h-9 w-52 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-6 grid gap-4">
          {[0, 1, 2].map((item) => (
            <Card key={item} className="space-y-3 p-5" aria-hidden="true">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
