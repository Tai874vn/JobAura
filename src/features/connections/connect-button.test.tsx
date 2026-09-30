import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ConnectionActions } from './connect-button'

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ user: null, isLoading: false, isAuthenticated: false }),
}))

describe('ConnectionActions', () => {
  it('offers guests a sign-in link instead of hiding the connect action', () => {
    const client = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ConnectionActions userId={42} userName="Ava" />
      </QueryClientProvider>
    )

    expect(html).toContain('Sign in to connect')
    expect(html).toContain('/auth/login?next=%2Fprofile%2F42')
  })
})
