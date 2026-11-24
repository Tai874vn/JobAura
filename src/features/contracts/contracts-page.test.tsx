import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { contractKeys } from './api'
import { ContractsPage, contractsListParams } from './contracts-page'

const mocks = vi.hoisted(() => ({ search: '' }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/contracts',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}))
vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ user: { id: 1, role: 'user' }, isLoading: false, isAuthenticated: true }),
}))

const ann = { id: 1, name: 'Ann Client', avatar: null }
const bob = { id: 2, name: 'Bob Maker', avatar: null }
const job = { id: 9, title: 'Logo design', image: null, price: 1000 }

const proposalRow = (id: number, over: Record<string, unknown> = {}) => ({
  id, status: 'OPEN', job: { ...job, title: `Service ${id}` }, client: ann, freelancer: bob, latestVersion: 2, turnUserId: 1,
  total: 1250, deadline: '2099-12-10T16:59:00.000Z', expiresAt: '2099-12-01T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z', viewerRole: 'client', ...over,
})
const contractRow = (id: number, over: Record<string, unknown> = {}) => ({
  id, status: 'ACTIVE', endReason: null, title: `Contract ${id}`, job, client: ann, freelancer: bob, total: 800, paid: 0, held: 0,
  currentMilestone: { id: 40, position: 1, title: 'Sketch', status: 'PENDING', dueDate: '2099-12-01T16:59:00.000Z', amount: 400, submittedAt: null },
  milestoneCount: 2, hasOpenAmendment: false, endRequestedById: null, viewerRole: 'client', updatedAt: '2026-11-22T00:00:00.000Z', ...over,
})
const version = (number: number, authorId: number, total: number) => ({
  id: number, number, authorId, total, createdAt: '2026-11-20T09:00:00.000Z', brief: `Brief of version ${number}`, referenceLinks: [], referenceImages: [],
  deadline: '2099-12-10T16:59:00.000Z',
  milestones: [{ title: 'Sketch', description: null, dueDate: '2099-12-01T16:59:00.000Z', amount: total }],
})
const proposalDetail = (over: Record<string, unknown> = {}) => ({
  id: 5, status: 'OPEN', job, client: ann, freelancer: bob, latestVersion: 2, turnUserId: 1, expiresAt: '2099-12-01T00:00:00.000Z',
  declineNote: null, decidedAt: null, versions: [version(1, 1, 1000), version(2, 2, 1250)], contractId: null, viewerRole: 'client', events: [],
  createdAt: '2026-11-18T09:00:00.000Z', updatedAt: '2026-11-20T09:00:00.000Z', ...over,
})

type Seed = { proposals?: unknown[]; contracts?: unknown[]; proposal?: unknown; contract?: unknown; filter?: 'all' | 'proposals' | 'active' }

function render(search: string, seed: Seed = {}) {
  mocks.search = search
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  const page = (rows: unknown[] | undefined) => ({ data: rows ?? [], total: (rows ?? []).length, page: 1, pageSize: 50, totalPages: 1 })
  const tab = search.includes('tab=freelancer') ? 'freelancer' : 'client'
  const filter = new URLSearchParams(search).get('filter') ?? 'all'
  if (filter === 'all') {
    client.setQueryData(contractKeys.proposals(contractsListParams(1, tab, 'OPEN')), page(seed.proposals))
    client.setQueryData(contractKeys.contracts(contractsListParams(1, tab, undefined)), page(seed.contracts))
  } else if (filter === 'proposals') {
    client.setQueryData(contractKeys.proposals(contractsListParams(1, tab, undefined)), page(seed.proposals))
  } else if (filter === 'active') {
    client.setQueryData(contractKeys.contracts(contractsListParams(1, tab, 'ACTIVE')), page(seed.contracts))
  }
  if (seed.proposal) client.setQueryData(contractKeys.proposal(5, 1), seed.proposal)
  if (seed.contract) client.setQueryData(contractKeys.contract(7, 1), seed.contract)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ContractsPage />
    </QueryClientProvider>,
  )
}

describe('ContractsPage', () => {
  it('shows both tabs and all the chips', () => {
    const html = render('')
    for (const text of ['As client', 'As freelancer', 'All', 'Proposals', 'Active', 'Completed', 'Ended']) expect(html).toContain(text)
    expect(html).toContain('aria-selected="true"')
  })

  it('lists open proposals before contracts, with the next action in bold green when it is mine', () => {
    const html = render('', { proposals: [proposalRow(5)], contracts: [contractRow(7)] })
    expect(html.indexOf('Service 5')).toBeGreaterThan(-1)
    expect(html.indexOf('Service 5')).toBeLessThan(html.indexOf('Contract 7'))
    // Proposal 5: it is the viewer's turn. Contract 7: milestone 1 is not funded and the viewer is the client.
    expect(html).toContain('Answer proposal')
    expect(html).toContain('Fund milestone 1')
    expect(html.match(/font-semibold text-primary/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain('1,250 credits')
    expect(html).toContain('800 credits')
    expect(html).toContain('Milestone 1 due')
  })

  it('shows the selected proposal: latest version first, the earlier version collapsed, and the turn actions', () => {
    const html = render('proposal=5', { proposals: [proposalRow(5)], contracts: [], proposal: proposalDetail() })
    expect(html).toContain('Version 2')
    expect(html).toContain('Brief of version 2')
    expect(html).toContain('Earlier versions (1)')
    expect(html).toContain('Total 1,000 credits to 1,250 credits')
    expect(html).toContain('It is your turn')
    for (const label of ['Accept', 'Counter', 'Decline']) expect(html).toContain(`>${label}<`)
    expect(html).not.toContain('>Withdraw<')
    expect(html).toContain('expires in')
  })

  it('shows Withdraw, and no Accept, when the viewer sent the latest version', () => {
    const html = render('proposal=5', { proposals: [proposalRow(5, { turnUserId: 2 })], proposal: proposalDetail({ turnUserId: 2, versions: [version(1, 2, 1000), version(2, 1, 1250)] }) })
    expect(html).toContain('>Withdraw<')
    expect(html).not.toContain('>Accept<')
    expect(html).toContain('Waiting for Bob Maker')
  })

  it('shows a loading panel with no action buttons while the proposal is being read', () => {
    const html = render('proposal=5', { proposals: [proposalRow(5)] })
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('>Accept<')
    expect(html).not.toContain('>Counter<')
  })

  it('opens the contract panel for ?contract=', () => {
    const detail = {
      ...contractRow(7), brief: 'b', referenceLinks: [], referenceImages: [], deadline: '2099-12-10T16:59:00.000Z', proposalId: null, remaining: 800,
      milestones: [], amendments: [], endRequest: null, review: null, canReview: false, graceMinutes: 4320, events: [], imported: false, createdAt: '2026-11-20T00:00:00.000Z', completedAt: null, endedAt: null,
    }
    const html = render('contract=7', { contracts: [contractRow(7)], contract: detail })
    expect(html).toContain('Contract 7')
    expect(html).toContain('Milestones')
  })

  it('keeps the freelancer tab and the chip from the address', () => {
    const html = render('tab=freelancer&filter=active', { contracts: [contractRow(7, { viewerRole: 'freelancer' })] })
    expect(html).toMatch(/aria-selected="true"[^>]*>As freelancer/)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Active/)
  })

  it('says so when a list is empty', () => {
    expect(render('')).toContain('Nothing here yet')
  })
})
