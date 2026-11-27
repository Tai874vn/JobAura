import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import type { Job } from '@/shared/schemas'
import { JobEditPage } from '../job-edit-page'

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ user: { id: 7, role: 'user' }, isLoading: false, isAuthenticated: true }),
}))

vi.mock('../job-form', () => ({
  JobForm: ({ job }: { job?: Job }) => <div data-testid="job-form">JobForm:{job?.title}</div>,
}))

const sampleJob: Job = {
  id: 55,
  title: 'Full-stack TypeScript Consulting',
  price: 1200,
  reviews: 0,
  rating: 0,
  shortDescription: 'Ship Next.js and NestJS features',
  description: 'End-to-end delivery for web apps.',
  creatorId: 7,
  subcategoryId: 3,
  workMode: 'REMOTE',
  serviceArea: null,
  updatedAt: '2026-11-20T12:00:00.000Z',
}

function renderWithClient(client: QueryClient, jobId = 55) {
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <JobEditPage jobId={jobId} />
    </QueryClientProvider>,
  )
}

describe('JobEditPage', () => {
  it('shows a retryable error state when the initial fetch fails with a server error', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
    })

    await client
      .fetchQuery({
        queryKey: queryKeys.job(55),
        queryFn: async () => {
          throw new AxiosError('Server down', 'ERR_BAD_RESPONSE', undefined, undefined, {
            status: 503,
            data: { message: 'Backend temporarily unavailable', requestId: 'req-503' },
          } as never)
        },
      })
      .catch(() => {})

    const html = renderWithClient(client, 55)

    expect(html).toContain('Could not load this post')
    expect(html).toContain('The AI service is not available right now. Please try again later. (ref: req-503)')
    expect(html).not.toContain('Backend temporarily unavailable')
    expect(html).toContain('>Try again</button>')
    expect(html).not.toContain('JobForm:')
  })

  it('shows the cannot-edit state when the initial fetch returns 404 or 403', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
    })

    await client
      .fetchQuery({
        queryKey: queryKeys.job(56),
        queryFn: async () => {
          throw new AxiosError('Not found', 'ERR_BAD_REQUEST', undefined, undefined, {
            status: 404,
            data: { message: 'Post not found' },
          } as never)
        },
      })
      .catch(() => {})

    const html = renderWithClient(client, 56)

    expect(html).toContain('You cannot edit this post')
    expect(html).not.toContain('Could not load this post')
    expect(html).not.toContain('JobForm:')
  })

  it('keeps JobForm mounted when a background refetch fails after the post has loaded', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
    })
    const key = queryKeys.job(55)

    client.setQueryData(key, { content: sampleJob })

    await client
      .fetchQuery({
        queryKey: key,
        staleTime: 0,
        queryFn: async () => {
          throw new AxiosError('Network Error', 'ERR_NETWORK')
        },
      })
      .catch(() => {})

    expect(client.getQueryState(key)?.status).toBe('error')

    const html = renderWithClient(client, 55)

    expect(html).toContain('JobForm:Full-stack TypeScript Consulting')
    expect(html).not.toContain('Could not load this post')
    expect(html).not.toContain('You cannot edit this post')
  })
})
