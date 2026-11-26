import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { pipelineKeys } from '../../api'
import { CallScreen } from './call-screen'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('application=2'),
}))
vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ user: { id: 9, role: 'employer' }, isLoading: false, isAuthenticated: true }),
}))

const application = {
  id: 2, hiringPostId: 4, applicantId: 7, status: 'INTERVIEWING', viewerRole: 'recruiter', createdAt: '2026-11-02T09:00:00', events: [],
  interviews: [{ id: 5, round: 1, mode: 'ONLINE', durationMinutes: 45, status: 'SCHEDULED', scheduledAt: '2099-11-25T03:00:00.000Z', proposedTimes: [] }],
  hiringPost: { id: 4, title: 'Frontend developer' },
  applicant: { id: 7, name: 'Linh Tran' },
}

describe('CallScreen', () => {
  it('shows a plain message with Leave and Skip when the call pass request fails', () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } } })
    client.setQueryData(pipelineKeys.detail(2, 9), application)
    client.getQueryCache().build(client, { queryKey: ['call-token', 5, 9] }).setState({ status: 'error', error: new Error('503'), fetchStatus: 'idle' })

    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <CallScreen interviewId={5} />
      </QueryClientProvider>,
    )

    expect(html).toContain('The call could not start.')
    expect(html).toMatch(/<button[^>]*>Leave<\/button>/)
    expect(html).toMatch(/<button[^>]*>Skip<\/button>/)
  })

  it('renders the full 3-part call loading shell while the interview detail is pending', () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } } })

    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <CallScreen interviewId={5} />
      </QueryClientProvider>,
    )

    expect(html).toContain('Loading the call')
    expect(html).toContain('<header')
    expect(html).toContain('<footer')
  })

  it('overlays the preparing pill without nested role="status" while the call pass loads', () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } } })
    client.setQueryData(pipelineKeys.detail(2, 9), application)

    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <CallScreen interviewId={5} />
      </QueryClientProvider>,
    )

    expect(html).toContain('Getting the call ready')
    expect(html).toContain('aria-hidden="true"')
    // Only the <p role="status"> and CallStageSkeleton have role="status" — never a nested Spinner status inside <p>.
    expect(html).not.toMatch(/<p[^>]*role="status"[^>]*>[^<]*<span[^>]*role="status"/)
  })
})
