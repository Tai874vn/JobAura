'use client'

import { QueryClient } from '@tanstack/react-query'

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 3,
      refetchOnWindowFocus: false,
    },
  },
})
