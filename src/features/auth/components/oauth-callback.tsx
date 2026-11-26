'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { broadcastSessionChange, resetClientSession, setCachedSession } from '@/shared/api/session-cache'
import { getSignedInRedirect } from '@/shared/lib/roles'
import { consumeOAuthNextPath, safeInternalPath } from '@/shared/lib/session-routing'
import { useChatStore } from '@/shared/stores/chat-store'
import { Card, CardContent, Spinner } from '@/shared/ui'

const oauthErrorMessages: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  invalid_state: 'The sign-in session expired. Please try again.',
  missing_code: 'Google did not return the required sign-in code. Please try again.',
  auth_failed: 'Google sign-in could not be completed. Please try again.',
}

function getOAuthErrorMessage(error: string) {
  return oauthErrorMessages[error] ?? 'Google sign-in could not be completed. Please try again.'
}

export function OAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const queryError = searchParams.get('error')
  const queryNext = searchParams.get('next')
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    if (queryError) return

    let cancelled = false
    async function finalizeOAuthSignIn() {
      useChatStore.getState().reset()
      resetClientSession(queryClient, { broadcast: false })
      try {
        const res = await queryClient.fetchQuery({
          queryKey: queryKeys.me,
          queryFn: authApi.me,
          staleTime: 0,
        })
        if (cancelled) return
        const user = res.content ?? null
        if (!user) {
          setSessionError('auth_failed')
          return
        }
        setCachedSession(user, queryClient)
        broadcastSessionChange('signin', user.id)
        const storedNext = consumeOAuthNextPath()
        const nextPath = queryNext != null ? safeInternalPath(queryNext) : storedNext
        router.replace(getSignedInRedirect(user, nextPath))
      } catch {
        if (!cancelled) setSessionError('auth_failed')
      }
    }

    void finalizeOAuthSignIn()
    return () => {
      cancelled = true
    }
  }, [queryClient, queryError, queryNext, router])

  const error = queryError ?? sessionError

  if (error) {
    return (
      <OAuthShell title="Google sign-in failed" description="We could not complete Google sign-in.">
        <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm font-medium text-danger">
          {getOAuthErrorMessage(error)}
        </p>
        <Link className="mt-4 inline-block font-medium text-primary" href="/auth/login">
          Back to sign in
        </Link>
      </OAuthShell>
    )
  }

  return (
    <OAuthShell title="Finishing sign-in" description="JobAura is confirming your Google session.">
      <Spinner className="mt-4 h-7 w-7" />
    </OAuthShell>
  )
}

function OAuthShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-2xl shadow-float">
        <CardContent className="p-8">
          <Link href="/welcome" className="mb-8 inline-block font-display text-xl font-medium text-primary">
            JobAura
          </Link>
          <h1 className="font-display text-2xl font-medium">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
          {children}
        </CardContent>
      </Card>
    </main>
  )
}
