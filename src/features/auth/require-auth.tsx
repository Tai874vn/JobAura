'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { canAccessRole, type AccountRole } from '@/shared/lib/roles'
import { Spinner } from '@/shared/ui'
import { useAuthStore } from '@/shared/stores/auth-store'

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
  const { user, hasHydrated, setStatus, setUser, clearSession } = useAuthStore()

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: hasHydrated,
    retry: false,
  })

  const verifiedUser = meQuery.data?.content ?? null
  const isChecking = !hasHydrated || meQuery.isPending
  const isStoreSynced = Boolean(verifiedUser && user?.id === verifiedUser.id)
  const requiredRoles = admin ? (['admin'] as const) : allowedRoles
  const hasRequiredRole = canAccessRole(verifiedUser?.role, requiredRoles)

  useEffect(() => {
    if (!hasHydrated) return
    setStatus('loading')
  }, [hasHydrated, setStatus])

  useEffect(() => {
    if (meQuery.isSuccess) setUser(verifiedUser)
    if (meQuery.isError) clearSession()
  }, [clearSession, meQuery.isError, meQuery.isSuccess, setUser, verifiedUser])

  useEffect(() => {
    if (isChecking || hasRedirectedRef.current) return

    if (!verifiedUser) {
      hasRedirectedRef.current = true
      router.replace(anonymousRedirect ?? `/auth/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (!hasRequiredRole) {
      hasRedirectedRef.current = true
      router.replace('/')
    }
  }, [anonymousRedirect, hasRequiredRole, isChecking, pathname, router, verifiedUser])

  if (isChecking || !verifiedUser || !isStoreSynced || !hasRequiredRole) {
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
