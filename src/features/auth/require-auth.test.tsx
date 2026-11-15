import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './require-auth'

const mocks = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock('./use-session', () => ({
  useSession: () => ({
    user: { id: 7, role: 'employer' },
    isLoading: false,
    isAuthenticated: true,
  }),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (effect: () => void) => effect(),
  }
})

describe('RequireAuth', () => {
  beforeEach(() => mocks.replace.mockClear())

  it('redirects a rejected employer to the employer home', () => {
    renderToStaticMarkup(
      <RequireAuth allowedRoles={['user', 'admin']}>
        <p>Worker home</p>
      </RequireAuth>
    )

    expect(mocks.replace).toHaveBeenCalledWith('/my-hiring-posts')
  })
})
