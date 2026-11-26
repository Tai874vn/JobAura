import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/features/auth/components/email-flows'
import { Spinner } from '@/shared/ui'

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Get a link to reset your JobAura password.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center" aria-label="Loading"><Spinner /></main>}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
