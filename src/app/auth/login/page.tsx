import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/auth-forms'
import { Spinner } from '@/shared/ui'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to JobAura to manage your services, jobs, candidates, and account.',
  robots: {
    index: false,
    follow: false,
  },
}

// Page /auth/login — renders <LoginForm> (features/auth/components/auth-forms.tsx).
export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center" aria-label="Loading sign in"><Spinner /></main>}>
      <LoginForm />
    </Suspense>
  )
}
