import type { Metadata } from 'next'
import { HomePage } from '@/features/jobs/home-page'

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Discover trusted freelance services and start working through JobAura.',
  alternates: {
    canonical: '/welcome',
  },
}

export default function WelcomePage() {
  return <HomePage />
}
