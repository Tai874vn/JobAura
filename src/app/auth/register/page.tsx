import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/components/auth-forms'
import { Spinner } from '@/shared/ui'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a JobAura account to buy services, sell services, or hire candidates.',
  robots: {
    index: false,
    follow: false,
  },
}

// Page /auth/register — renders <RegisterForm> (features/auth/components/auth-forms.tsx).
export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center" aria-label="Loading registration"><Spinner /></main>}>
      <RegisterForm />
    </Suspense>
  )
}
