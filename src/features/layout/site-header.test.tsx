import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { walletKeys } from '@/features/wallet/api'
import { SiteHeader } from './site-header'

const mocks = vi.hoisted(() => ({ session: { user: null as null | { id: number; name: string; role: string; avatar: null }, isLoading: true } }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}))

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ ...mocks.session, isAuthenticated: Boolean(mocks.session.user) }),
}))

// The live-update and bell parts open sockets and read other queries; they are not under test here.
vi.mock('@/features/hiring-pipeline/use-pipeline-live-updates', () => ({ PipelineLiveUpdates: () => null }))
vi.mock('@/features/contracts/hooks/use-contract-live-updates', () => ({ ContractLiveUpdates: () => null }))
vi.mock('@/features/notifications/notification-bell', () => ({ NotificationBell: () => null }))

function render() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(walletKeys.summary(mocks.session.user?.id), { available: 1250, held: 0, paidOut: 0, earned: 0, topUp: { enabled: false, minCredits: 1, maxCredits: 2, vndPerCredit: 1 } })
  return renderToStaticMarkup(<QueryClientProvider client={client}><SiteHeader /></QueryClientProvider>)
}

describe('SiteHeader', () => {
  beforeEach(() => { mocks.session = { user: null, isLoading: true } })

  it('keeps a disabled Sign in control visible while the session is loading', () => {
    const html = render()

    expect(html).toContain('>Sign in</button>')
    expect(html).toContain('aria-busy="true"')
  })

  it('puts the visitor links in the server HTML but keeps the bar invisible while the session loads', () => {
    const html = render()
    const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'))

    expect(nav).toContain('href="/hiring-posts"')
    expect(nav).toContain('href="/jobs"')
    expect(nav).toMatch(/^<nav class="[^"]* invisible[ "]/)
  })

  it('shows the visitor links once a visitor session is known', () => {
    mocks.session = { user: null, isLoading: false }
    const nav = render().split('</nav>')[0]

    expect(nav).toContain('href="/hiring-posts"')
    expect(nav.slice(nav.indexOf('<nav'))).not.toMatch(/^<nav class="[^"]* invisible[ "]/)
  })

  it('shows a signed-in person only their own links, never the visitor set', () => {
    mocks.session = { user: { id: 2, name: 'Rae', role: 'employer', avatar: null }, isLoading: false }
    const html = render()
    const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'))

    expect(nav).toContain('href="/my-hiring-posts"')
    expect(nav).not.toContain('href="/jobs"')
    expect(nav).not.toMatch(/^<nav class="[^"]* invisible[ "]/)
  })

  it('shows the balance chip linking to /wallet for a signed-in user', () => {
    mocks.session = { user: { id: 1, name: 'Ann', role: 'user', avatar: null }, isLoading: false }
    const html = render()

    expect(html).toContain('href="/wallet"')
    expect(html).toContain('>1,250 credits<')
  })

  it('shows no balance chip for a visitor', () => {
    mocks.session = { user: null, isLoading: false }
    const html = render()

    expect(html).not.toContain('href="/wallet"')
    expect(html).not.toContain('credits')
  })
})
