'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
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
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) return

    queryClient.invalidateQueries({ queryKey: queryKeys.me })
    const timeoutId = window.setTimeout(() => {
      window.location.replace('/')
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [error, queryClient])

  if (error) {
    return (
      <OAuthShell title="Google sign-in failed" description="The backend could not complete Google authentication.">
        <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm font-medium text-danger">
          {getOAuthErrorMessage(error)}
        </p>
        <Link className="mt-4 inline-block font-semibold text-primary" href="/auth/login">
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
        <CardContent className="p-6">
          <Link href="/" className="mb-8 inline-block font-display text-2xl font-bold text-primary">
            JobAura
          </Link>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
