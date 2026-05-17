import type { Metadata } from 'next'
import './globals.css'
import { AppProviders } from '@/shared/providers/app-providers'

export const metadata: Metadata = {
  title: 'JobAura',
  description: 'Find trusted freelance services and manage work in one marketplace.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
