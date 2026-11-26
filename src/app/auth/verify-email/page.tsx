import { Suspense } from 'react'
import type { Metadata } from 'next'
import { VerifyEmailView } from '@/features/auth/components/email-flows'
import { Spinner } from '@/shared/ui'

export const metadata: Metadata = {
  title: 'Confirm your email',
  description: 'Confirm the email address of your JobAura account.',
  robots: { index: false, follow: false },
}

// Page /auth/verify-email — renders <VerifyEmailView> (features/auth/components/email-flows.tsx).
export default function Page() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center" aria-label="Loading"><Spinner /></main>}>
      <VerifyEmailView />
    </Suspense>
  )
}
