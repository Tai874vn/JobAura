'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { Spinner } from '@/shared/ui'
import { useAuthStore } from '@/shared/stores/auth-store'

export function RequireAuth({
  children,
  admin = false,
}: {
  children: React.ReactNode
  admin?: boolean
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
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (admin && verifiedUser.role !== 'admin') {
      hasRedirectedRef.current = true
      router.replace('/')
    }
  }, [admin, isChecking, pathname, router, verifiedUser])

  if (isChecking || !verifiedUser || !isStoreSynced || (admin && verifiedUser.role !== 'admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  return <>{children}</>
}
