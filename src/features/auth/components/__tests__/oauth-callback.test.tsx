import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OAuthCallback } from '../oauth-callback'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
  me: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/shared/api/endpoints', () => ({
  authApi: {
    me: () => mocks.me(),
  },
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (effect: () => void) => {
      effect()
    },
  }
})

describe('OAuthCallback next handling', () => {
  beforeEach(() => {
    mocks.replace.mockClear()
    mocks.searchParams = new URLSearchParams()
    mocks.me.mockResolvedValue({ content: { id: 5, role: 'employer', name: 'Recruiter' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects to a safe internal ?next= path after OAuth sign-in', async () => {
    mocks.searchParams = new URLSearchParams('next=%2Fcontracts%3Fcontract%3D42')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <OAuthCallback />
      </QueryClientProvider>,
    )

    await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/contracts?contract=42'))
  })

  it('rejects every open-redirect attack string in ?next= and falls back to the role home', async () => {
    for (const attack of ['/.//evil.com', '/..//evil.com', '/a/..//evil.com', '/%2e//evil.com', '//evil.com', '/\\evil.com']) {
      mocks.replace.mockClear()
      mocks.searchParams = new URLSearchParams([['next', attack]])
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

      renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <OAuthCallback />
        </QueryClientProvider>,
      )

      await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/my-hiring-posts'))
    }
  })
})
