import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { walletKeys } from '../api'
import { WalletPage } from './wallet-page'
import { WalletChip } from './wallet-chip'

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ user: { id: 1, role: 'user' }, isLoading: false, isAuthenticated: true }),
}))

const summary = { available: 1250, held: 400, paidOut: 800, earned: 1, topUp: { enabled: true, minCredits: 100, maxCredits: 5000, vndPerCredit: 1000, currency: 'usd', centsPerCredit: 5 } }
const row = (id: number, over: Record<string, unknown> = {}) => ({
  id, type: 'FUND_HOLD', availableDelta: -400, heldDelta: 400, availableAfter: 4600, heldAfter: 400,
  contract: { id: 7, title: 'Logo design' }, milestone: { id: 40, position: 2, title: 'Sketch' }, counterparty: null, topUpId: null,
  createdAt: '2026-11-20T09:00:00.000Z', ...over,
})

function render(ui: React.ReactNode, seed: (c: QueryClient) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  seed(client)
  return renderToStaticMarkup(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('WalletPage', () => {
  it('shows the four figures, the note and the ledger rows linking to the contract', () => {
    const html = render(<WalletPage />, (c) => {
      c.setQueryData(walletKeys.summary(1), summary)
      c.setQueryData(walletKeys.ledger({ pageSize: 20 }, 1), {
        pages: [{ data: [row(2), row(1, { type: 'SEED', availableDelta: 5000, heldDelta: 0, availableAfter: 5000, heldAfter: 0, contract: null, milestone: null })], total: 2, page: 1, pageSize: 20, totalPages: 1 }],
        pageParams: [1],
      })
    })
    for (const text of ['Available', 'Held', 'Paid out', 'Earned', '1,250 credits', '400 credits', '800 credits', '1 credit']) expect(html).toContain(text)
    expect(html).toContain('Credits are demo money for this project. Every user starts with 5,000 credits.')
    expect(html).toContain('Held for milestone 2 · Logo design')
    expect(html).toContain('href="/contracts?contract=7"')
    expect(html).toContain('Starting credits')
    expect(html).toContain('+5,000 credits')
    expect(html).not.toContain('Load more')
    expect(html).not.toMatch(/[$€₫]|USD|VND/)
  })

  it('shows the Top up button only when the server enables it', () => {
    const seed = (enabled: boolean) => (c: QueryClient) => {
      c.setQueryData(walletKeys.summary(1), { ...summary, topUp: { ...summary.topUp, enabled } })
    }
    const on = render(<WalletPage />, seed(true))
    expect(on).toContain('>Top up</button>')
    expect(on).not.toMatch(/[$€₫]|VND/)
    const off = render(<WalletPage />, seed(false))
    expect(off).not.toContain('Top up</button>')
  })

  it('offers Load more while there is a next page', () => {
    const html = render(<WalletPage />, (c) => {
      c.setQueryData(walletKeys.summary(1), summary)
      c.setQueryData(walletKeys.ledger({ pageSize: 20 }, 1), {
        pages: [{ data: [row(1)], total: 30, page: 1, pageSize: 20, totalPages: 2 }], pageParams: [1],
      })
    })
    expect(html).toContain('Load more')
  })

  it('shows Try again buttons and stops skeleton animation when balance or history fails', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
    })
    await client.fetchQuery({
      queryKey: walletKeys.summary(1),
      queryFn: async () => { throw new Error('Server offline') },
    }).catch(() => {})
    await client.fetchInfiniteQuery({
      queryKey: walletKeys.ledger({ pageSize: 20 }, 1),
      queryFn: async () => { throw new Error('Ledger offline') },
      initialPageParam: 1,
    }).catch(() => {})

    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}><WalletPage /></QueryClientProvider>,
    )

    expect(html).toContain('Your balance could not be loaded.')
    expect(html).toContain('The history could not be loaded.')
    expect(html.match(/>Try again<\/button>/g)).toHaveLength(2)
    expect(html).not.toContain('animate-pulse')
  })
})

describe('WalletChip', () => {
  it('shows a skeleton, not 0 credits, while loading', () => {
    const html = render(<WalletChip />, () => {})
    expect(html).toContain('animate-pulse')
    expect(html).not.toContain('credits')
  })

  it('shows the balance as a link to /wallet', () => {
    const html = render(<WalletChip />, (c) => c.setQueryData(walletKeys.summary(1), summary))
    expect(html).toContain('href="/wallet"')
    expect(html).toContain('>1,250 credits<')
  })
})
