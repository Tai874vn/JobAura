import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/features/auth/components/email-flows'
import { Spinner } from '@/shared/ui'

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Choose a new password for your JobAura account.',
  robots: { index: false, follow: false },
}

// Page /auth/reset-password — renders <ResetPasswordForm> (features/auth/components/email-flows.tsx).
export default function Page() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center" aria-label="Loading"><Spinner /></main>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
