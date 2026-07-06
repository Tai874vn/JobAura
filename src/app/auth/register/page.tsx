import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/auth-forms'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a JobAura account to buy services, sell services, or hire candidates.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RegisterPage() {
  return <RegisterForm />
}
