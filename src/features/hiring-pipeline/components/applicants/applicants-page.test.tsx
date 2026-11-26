import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { pipelineKeys } from '../../api'
import { applicantsListParams, ApplicantsPage, filledText } from './applicants-page'

const mocks = vi.hoisted(() => ({ search: 'application=12' }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/my-hiring-posts/5/applicants',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}))
vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ user: { id: 2, role: 'employer' }, isLoading: false, isAuthenticated: true }),
}))

const post = { id: 5, recruiterId: 2, title: 'Senior Test Engineer', description: 'x', skills: [], status: 'OPEN', openings: 2, hiredCount: 1, offersWaiting: 0 }
const row = (id: number, name: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, hiringPostId: 5, applicantId: id * 10, status, createdAt: '2026-11-12T10:00:00', interviews: [],
  applicant: { id: id * 10, name, avatar: null, headline: null, location: 'Da Nang', profileSkills: [] },
  resume: { occupationTitle: 'software tester', years: 6, level: 'Senior', jobs: [], skills: ['Cypress'], degree: 'BSc' },
  hiringPost: post, ...extra,
})
const counts = { APPLIED: 3, REVIEWING: 2, INTERVIEWING: 1, OFFERED: 1, HIRED: 1, REJECTED: 4, DECLINED: 0, WITHDRAWN: 1 }
const rows = [
  row(11, 'Mai Tran', 'APPLIED'),
  row(12, 'Khoa Nguyen', 'INTERVIEWING', {
    interviews: [{ id: 1, round: 1, mode: 'ONLINE', durationMinutes: 45, status: 'SCHEDULED', scheduledAt: '2099-11-25T03:00:00.000Z', proposedTimes: [] }],
  }),
]
// The full application (what GET /applications/:id sends) adds the history.
const fullDetail = { ...rows[1], events: [{ id: 1, type: 'applied', createdAt: '2026-11-12T10:00:00' }] }

function render(search = 'application=12') {
  mocks.search = search
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(['hiring-posts', 'detail', 5, 2], { content: post })
  client.setQueryData(pipelineKeys.list(5, applicantsListParams(undefined, 1), 2), { data: rows, counts, totalPages: 1 })
  client.setQueryData(pipelineKeys.detail(12, 2), fullDetail)
  client.setQueryData(pipelineKeys.detail(11, 2), { ...rows[0], events: [] })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ApplicantsPage postId={5} />
    </QueryClientProvider>,
  )
}

describe('ApplicantsPage', () => {
  it('shows the post header, with how many are filled', () => {
    const html = render()
    expect(html).toContain('Senior Test Engineer')
    expect(html).toContain('1 of 2 filled')
    expect(html).toContain('View post')
    expect(html).toContain('href="/my-hiring-posts?edit=5"')
  })

  it('shows every tab with its count (All adds up all 8 statuses)', () => {
    const html = render()
    for (const label of ['All', 'New', 'Shortlisted', 'Interview', 'Offer', 'Hired', 'Not selected']) expect(html).toContain(label)
    expect(html).toMatch(/All<span[^>]*>13<\/span>/)
    expect(html).toMatch(/New<span[^>]*>3<\/span>/)
    expect(html).toMatch(/Not selected<span[^>]*>4<\/span>/)
  })

  it('lists the applicants and opens the one in ?application=', () => {
    const html = render()
    expect(html).toContain('Mai Tran')
    expect(html).toContain('aria-current="true"')
    // The panel shows the selected applicant: resume, the booked time, and the buttons for an active interview.
    expect(html).toContain('id="applicant-12"')
    expect(html).toContain('Cypress')
    expect(html).toContain('Reject')
    expect(html).toContain('You can send an offer after the interview.')
  })

  it('shows only the row header and no buttons while the full application loads', () => {
    mocks.search = 'application=12'
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    client.setQueryData(['hiring-posts', 'detail', 5, 2], { content: post })
    client.setQueryData(pipelineKeys.list(5, applicantsListParams(undefined, 1), 2), { data: rows, counts, totalPages: 1 })
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ApplicantsPage postId={5} />
      </QueryClientProvider>,
    )
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Request interview')
    expect(html).not.toContain('no saved resume')
  })

  it('opens the first applicant on wide screens when nothing is picked, and hides the detail view on phones', () => {
    const html = render('')
    expect(html).toContain('id="applicant-11"')
    expect(html).toContain('hidden lg:block')
    expect(html).toContain('Shortlist')
  })

  it('says "Hiring without a limit" for a post with no openings number', () => {
    expect(filledText({ openings: null, hiredCount: 4 })).toBe('Hiring without a limit')
    expect(filledText({ openings: 3, hiredCount: 0 })).toBe('0 of 3 filled')
  })
})
