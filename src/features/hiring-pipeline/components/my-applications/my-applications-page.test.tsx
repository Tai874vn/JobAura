import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { pipelineKeys } from '../../api'
import { MyApplicationsPage, myApplicationsParams } from './my-applications-page'

const mocks = vi.hoisted(() => ({ search: 'application=2' }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/my-applications',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}))
vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ user: { id: 7, role: 'user' }, isLoading: false, isAuthenticated: true }),
}))

const post = (id: number, title: string) => ({
  id, recruiterId: 90 + id, title, description: 'Test the booking app.', skills: [], status: 'OPEN', companyName: 'Harbor Health', location: 'Remote',
  employmentType: 'Full-time', recruiter: { id: 90 + id, name: 'Ly Ngoc Emma' },
})
const app = (id: number, status: string, extra: Record<string, unknown> = {}) => ({
  id, hiringPostId: id, applicantId: 7, status, createdAt: '2026-11-02T09:00:00', interviews: [], events: [],
  hiringPost: post(id, `Role ${id}`), ...extra,
})
const proposed = { id: 5, round: 1, mode: 'ONLINE', durationMinutes: 45, status: 'PROPOSED', proposedTimes: ['2099-11-25T03:00:00.000Z'] }
const rows = [
  app(1, 'INTERVIEWING', { interviews: [proposed] }),
  app(2, 'REJECTED', { statusReason: 'POSITION_FILLED' }),
  app(3, 'OFFERED', { offerNote: 'Start on 1 Dec.' }),
  app(4, 'REVIEWING'),
]
const upcomingRow = {
  id: 8, applicationId: 3, round: 1, mode: 'ONLINE', durationMinutes: 45, status: 'SCHEDULED', scheduledAt: '2099-11-26T03:00:00.000Z', proposedTimes: [],
  post: { id: 3, title: 'Role 3', companyName: 'Harbor Health' }, otherPerson: { id: 93, name: 'Ly Ngoc Emma' }, viewerRole: 'candidate',
}

function render(search: string, details: Record<number, unknown> = {}) {
  mocks.search = search
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(pipelineKeys.mine(myApplicationsParams(1), 7), { data: rows, total: 4, page: 1, pageSize: 20, totalPages: 1 })
  client.setQueryData(pipelineKeys.upcoming(7), [upcomingRow])
  for (const [id, value] of Object.entries(details)) client.setQueryData(pipelineKeys.detail(Number(id), 7), value)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MyApplicationsPage />
    </QueryClientProvider>,
  )
}

describe('MyApplicationsPage', () => {
  it('lists each application with its status and marks the ones that need an answer', () => {
    const html = render('')
    expect(html).toContain('My applications')
    for (const title of ['Role 1', 'Role 2', 'Role 3', 'Role 4']) expect(html).toContain(title)
    // Role 1 has a time to pick, role 3 has an offer: both are marked; the other two are not.
    expect(html.match(/Action needed/g)).toHaveLength(2)
    expect(html).toContain('Offer received')
  })

  it('shows the upcoming interview with a Join call link', () => {
    const html = render('')
    expect(html).toContain('Upcoming interviews')
    expect(html).toContain('href="/interviews/8/call?application=')
  })

  it('opens a swept application from a notification and says Position filled, not an error', () => {
    const html = render('application=2', { 2: { ...rows[1], events: [{ id: 1, type: 'applied', createdAt: '2026-11-02T09:00:00' }, { id: 2, type: 'rejected', data: { reason: 'POSITION_FILLED' }, createdAt: '2026-11-05T09:00:00' }] } })
    expect(html).toContain('Not selected · Position filled')
    expect(html).not.toContain('Could not open')
    // A finished application cannot be withdrawn.
    expect(html).not.toContain('Withdraw application')
  })

  it('shows the offer card, with Accept and Decline, for an offered application', () => {
    const html = render('application=3', { 3: { ...rows[2], offeredAt: '2026-11-10T09:00:00' } })
    expect(html).toContain('Start on 1 Dec.')
    expect(html).toContain('Accept offer')
    expect(html).toContain('Decline')
    expect(html).toContain('Withdraw application')
    expect(html).toContain('Message Ly')
  })

  it('shows the interview card where the candidate picks a time', () => {
    const html = render('application=1', { 1: rows[0] })
    expect(html).toContain('Pick this time')
    expect(html).toContain('None of these work')
  })

  it('shows a loading panel and no buttons while the full application loads', () => {
    const html = render('application=4')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Withdraw application')
  })

  it('does not draw an application that belongs to someone else', () => {
    const html = render('application=4', { 4: { ...rows[3], applicantId: 99 } })
    expect(html).toContain('Could not open this application')
    expect(html).not.toContain('Withdraw application')
  })
})
