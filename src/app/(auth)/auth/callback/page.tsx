import { Suspense } from 'react'
import { OAuthCallback } from '@/features/auth/oauth-callback'
import { Spinner } from '@/shared/ui'

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <OAuthCallback />
    </Suspense>
  )
}
