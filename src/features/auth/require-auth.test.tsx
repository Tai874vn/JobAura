import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './require-auth'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/',
  session: {
    user: { id: 7, role: 'employer' } as { id: number; role: string } | null,
    isLoading: false,
    isAuthenticated: true,
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock('./use-session', () => ({
  useSession: () => mocks.session,
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (effect: () => void) => effect(),
  }
})

describe('RequireAuth', () => {
  beforeEach(() => {
    mocks.replace.mockClear()
    mocks.pathname = '/'
    mocks.session = {
      user: { id: 7, role: 'employer' },
      isLoading: false,
      isAuthenticated: true,
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects a rejected employer to the employer home', () => {
    renderToStaticMarkup(
      <RequireAuth allowedRoles={['user', 'admin']}>
        <p>Worker home</p>
      </RequireAuth>,
    )

    expect(mocks.replace).toHaveBeenCalledWith('/my-hiring-posts')
  })

  it('preserves query parameters in ?next= when redirecting anonymous visitors', () => {
    mocks.pathname = '/contracts'
    mocks.session = { user: null, isLoading: false, isAuthenticated: false }
    vi.stubGlobal('window', { location: { search: '?contract=42' } })

    renderToStaticMarkup(
      <RequireAuth>
        <p>Contracts</p>
      </RequireAuth>,
    )

    expect(mocks.replace).toHaveBeenCalledWith('/auth/login?next=%2Fcontracts%3Fcontract%3D42')
  })
})
