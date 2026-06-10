'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Toaster } from 'sonner'

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools), { ssr: false })
    : null

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 1000 * 60 * 3,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
      {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
