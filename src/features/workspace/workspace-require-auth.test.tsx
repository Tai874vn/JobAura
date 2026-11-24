import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { workspaceSkeletonForPathname, WorkspaceRequireAuth } from './workspace-require-auth'

const mocks = vi.hoisted(() => ({
  pathname: '/contracts',
  replace: vi.fn(),
  session: {
    user: null as { id: number; role: string } | null,
    isLoading: true,
    isAuthenticated: false,
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => mocks.session,
}))

describe('workspaceSkeletonForPathname', () => {
  it('maps each workspace route to its matching page skeleton', () => {
    expect(workspaceSkeletonForPathname('/contracts')).toBe('contracts')
    expect(workspaceSkeletonForPathname('/contracts/')).toBe('contracts')
    expect(workspaceSkeletonForPathname('/my-applications')).toBe('my-applications')
    expect(workspaceSkeletonForPathname('/my-applications/')).toBe('my-applications')
    expect(workspaceSkeletonForPathname('/my-hiring-posts/42/applicants')).toBe('applicants')
    expect(workspaceSkeletonForPathname('/my-hiring-posts/42/applicants/')).toBe('applicants')
    expect(workspaceSkeletonForPathname('/my-hiring-posts')).toBe('my-hiring-posts')
    expect(workspaceSkeletonForPathname('/my-hiring-posts/')).toBe('my-hiring-posts')
  })

  it('returns null (generic fallback) for other paths and malformed segments', () => {
    expect(workspaceSkeletonForPathname('/wallet')).toBeNull()
    expect(workspaceSkeletonForPathname('/settings')).toBeNull()
    expect(workspaceSkeletonForPathname('/connections')).toBeNull()
    expect(workspaceSkeletonForPathname('/my-hiring-posts/42')).toBeNull()
    expect(workspaceSkeletonForPathname('/my-hiring-posts/42/applicants/extra')).toBeNull()
    expect(workspaceSkeletonForPathname('/my-hiring-posts//applicants')).toBeNull()
    expect(workspaceSkeletonForPathname('/contracts/12')).toBeNull()
    expect(workspaceSkeletonForPathname('')).toBeNull()
    expect(workspaceSkeletonForPathname(null)).toBeNull()
    expect(workspaceSkeletonForPathname(undefined)).toBeNull()
  })
})

describe('WorkspaceRequireAuth', () => {
  beforeEach(() => {
    mocks.replace.mockClear()
    mocks.session = { user: null, isLoading: true, isAuthenticated: false }
  })

  it('renders the matching page skeleton while session is loading', () => {
    mocks.pathname = '/contracts'
    const contractsHtml = renderToStaticMarkup(<WorkspaceRequireAuth><p>Body</p></WorkspaceRequireAuth>)
    expect(contractsHtml).toContain('Loading contracts')

    mocks.pathname = '/my-applications'
    const applicationsHtml = renderToStaticMarkup(<WorkspaceRequireAuth><p>Body</p></WorkspaceRequireAuth>)
    expect(applicationsHtml).toContain('Loading applications')

    mocks.pathname = '/my-hiring-posts/15/applicants'
    const applicantsHtml = renderToStaticMarkup(<WorkspaceRequireAuth><p>Body</p></WorkspaceRequireAuth>)
    expect(applicantsHtml).toContain('Loading applications')

    mocks.pathname = '/my-hiring-posts'
    const myPostsHtml = renderToStaticMarkup(<WorkspaceRequireAuth><p>Body</p></WorkspaceRequireAuth>)
    expect(myPostsHtml).toContain('Loading your hiring posts')
  })

  it('falls back to the generic RequireAuth skeleton on other workspace paths', () => {
    mocks.pathname = '/wallet'
    const html = renderToStaticMarkup(<WorkspaceRequireAuth><p>Body</p></WorkspaceRequireAuth>)

    expect(html).toContain('Checking access')
    expect(html).not.toContain('Loading contracts')
    expect(html).not.toContain('Loading applications')
    expect(html).not.toContain('Loading your hiring posts')
  })
})
