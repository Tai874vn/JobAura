import type { Metadata } from 'next'
import { RoleHomePage } from '@/features/feed/role-home-page'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your personalized JobAura workspace feed.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function Page() {
  return <RoleHomePage />
}
