import { Suspense } from 'react'
import type { Metadata } from 'next'
import { OAuthCallback } from '@/features/auth/oauth-callback'
import { Spinner } from '@/shared/ui'

export const metadata: Metadata = {
  title: 'Signing in',
  robots: {
    index: false,
    follow: false,
  },
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <OAuthCallback />
    </Suspense>
  )
}
