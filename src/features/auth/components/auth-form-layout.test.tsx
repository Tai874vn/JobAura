import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPageGate } from './auth-form-layout'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  session: {
    user: null as { id: number; role: string } | null,
    isLoading: true,
    isAuthenticated: false,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock('../hooks/use-session', () => ({
  useSession: () => mocks.session,
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (effect: () => void) => effect(),
  }
})

describe('AuthPageGate', () => {
  beforeEach(() => {
    mocks.replace.mockClear()
    mocks.session = { user: null, isLoading: true, isAuthenticated: false }
  })

  it('renders auth form children immediately on SSR without a spinner lock', () => {
    const html = renderToStaticMarkup(
      <AuthPageGate>
        <form>Sign in form</form>
      </AuthPageGate>,
    )

    expect(html).toContain('Sign in form')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('redirects signed-in users away from auth pages using safe next paths', () => {
    mocks.session = { user: { id: 3, role: 'employer' }, isLoading: false, isAuthenticated: true }

    const html = renderToStaticMarkup(
      <AuthPageGate nextPath="/contracts?contract=42">
        <form>Sign in form</form>
      </AuthPageGate>,
    )

    expect(html).toContain('Redirecting to your workspace')
    expect(mocks.replace).toHaveBeenCalledWith('/contracts?contract=42')
  })

  it('ignores disallowed loop and open-redirect attack next paths and falls back to the role home', () => {
    mocks.session = { user: { id: 3, role: 'employer' }, isLoading: false, isAuthenticated: true }

    for (const badNext of ['/auth/login', '/.//evil.com', '/..//evil.com', '/a/..//evil.com', '/%2e//evil.com']) {
      mocks.replace.mockClear()
      renderToStaticMarkup(
        <AuthPageGate nextPath={badNext}>
          <form>Sign in form</form>
        </AuthPageGate>,
      )

      expect(mocks.replace).toHaveBeenCalledWith('/my-hiring-posts')
    }
  })
})
