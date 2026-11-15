import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SiteHeader } from './site-header'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}))

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  }),
}))

describe('SiteHeader', () => {
  it('keeps a disabled Sign in control visible while the session is loading', () => {
    const html = renderToStaticMarkup(<SiteHeader />)

    expect(html).toContain('>Sign in</button>')
    expect(html).toContain('aria-busy="true"')
  })
})
