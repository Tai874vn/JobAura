import type { Metadata } from 'next'
import { Hanken_Grotesk, Inter } from 'next/font/google'
import './globals.css'
import { LazyChatShell } from '@/features/chat/lazy-chat-shell'
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

const defaultDescription = 'Find trusted freelance services and manage work in one marketplace.'

function siteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001')
  } catch {
    return new URL('http://localhost:3001')
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} ${hankenGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <AppProviders>
          {children}
          <LazyChatShell />
        </AppProviders>
      </body>
    </html>
  )
}
