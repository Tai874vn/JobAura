/**
 * Root layout for every page on JobAura. It sets site metadata and fonts, then wraps the app in providers, live socket state, and the chat overlay.
 *
 * Calls: AppProviders; RealtimeProvider; LazyChatShell
 * Used by:
 *   - Next.js router: layout for /
 */

import type { Metadata } from 'next'
import { Hanken_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { RealtimeProvider } from '@/features/auth/components/realtime-provider'
import { LazyChatShell } from '@/features/chat/components/lazy-chat-shell'
import { AppProviders } from '@/shared/providers/app-providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hanken',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-jb',
})

const defaultDescription = 'Find trusted freelance services and manage work in one marketplace.'

function siteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  } catch {
    return new URL('http://localhost:3000')
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: 'JobAura',
  title: {
    default: 'JobAura',
    template: '%s | JobAura',
  },
  description: defaultDescription,
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg'],
  },
  openGraph: {
    title: 'JobAura',
    description: defaultDescription,
    url: '/',
    siteName: 'JobAura',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobAura',
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
}

// Layout of the whole site (every page) — renders <RealtimeProvider> (features/auth/components/realtime-provider.tsx), <LazyChatShell> (features/chat/components/lazy-chat-shell.tsx).
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <AppProviders>
          <RealtimeProvider>
            {children}
            <LazyChatShell />
          </RealtimeProvider>
        </AppProviders>
      </body>
    </html>
  )
}
