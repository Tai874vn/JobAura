import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import { ConnectionActions } from '../connect-button'

const session = vi.hoisted(() => ({ user: null as { id: number } | null, isLoading: false }))

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ user: session.user, isLoading: session.isLoading, isAuthenticated: Boolean(session.user) }),
}))

describe('ConnectionActions', () => {
  beforeEach(() => {
    session.user = null
    session.isLoading = false
  })

  it('reserves button height with a skeleton while the session is still loading', () => {
    session.isLoading = true
    const client = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ConnectionActions userId={42} userName="Ava" />
      </QueryClientProvider>
    )

    expect(html).toContain('motion-safe:animate-pulse')
    expect(html).toContain('h-8')
  })

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

  it('keeps a named busy control visible while checking the relationship', () => {
    session.user = { id: 1 }
    const client = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ConnectionActions userId={42} userName="Ava" />
      </QueryClientProvider>
    )

    expect(html).toContain('Loading connection')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled=""')
    client.clear()
  })

  it('offers retry when the relationship check fails', async () => {
    session.user = { id: 1 }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false } } })
    await client.fetchQuery({
      queryKey: queryKeys.connectionStatus(42, 1),
      queryFn: () => Promise.reject(new Error('Connection unavailable')),
    }).catch(() => undefined)
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ConnectionActions userId={42} userName="Ava" />
      </QueryClientProvider>
    )

    expect(html).toContain('Connection status unavailable.')
    expect(html).toContain('Retry')
    client.clear()
  })
})
