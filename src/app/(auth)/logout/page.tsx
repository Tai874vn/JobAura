import type { Metadata } from 'next'
import { LogoutPage } from '@/features/auth/components/logout-page'

export const metadata: Metadata = {
  title: 'Signing out',
  robots: {
    index: false,
    follow: false,
  },
}

// Page /logout — renders <LogoutPage> (features/auth/components/logout-page.tsx).
export default function LogoutRoute() {
  return <LogoutPage />
}
