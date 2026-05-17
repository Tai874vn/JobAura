import { Suspense } from 'react'
import { LoginForm } from '@/features/auth/auth-forms'
import { Spinner } from '@/shared/ui'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <LoginForm />
    </Suspense>
  )
}
