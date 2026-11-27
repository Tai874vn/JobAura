'use client'

/**
 * Root client provider wrapper for the whole app. Sets up React Query, toast notifications, dev tools in development, and cross-tab session sync that resets chat state on sign-out.
 *
 * Calls: getQueryClient; subscribeSessionSync; useChatStore
 * Used by:
 *   - app/layout.tsx
 */

import { QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { getQueryClient } from '@/shared/api/query-client'
import { subscribeSessionSync } from '@/shared/api/session-cache'
import { useChatStore } from '@/shared/stores/chat-store'

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools), { ssr: false })
    : null

export function AppProviders({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  useEffect(() => {
    return subscribeSessionSync(queryClient, () => useChatStore.getState().reset())
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
      {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
