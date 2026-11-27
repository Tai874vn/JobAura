import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import { RequestError } from '@/shared/lib/errors'
import { hiringPostPageParams } from '../../../utils/recommended-candidates/constants'
import { RecommendedCandidatesPage } from '../recommended-candidates-page'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ user: { id: 9, role: 'employer' }, isLoading: false, isAuthenticated: true }),
}))

describe('RecommendedCandidatesPage', () => {
  it('shows an error message and Try again button instead of 0 of 0 and No AI uses left when quota fails', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
    })
    client.setQueryData(queryKeys.myHiringPosts(hiringPostPageParams, 9), {
      content: {
        data: [
          {
            id: 42,
            recruiterId: 9,
            title: 'Backend Engineer',
            description: 'Build APIs for the hiring platform.',
            skills: ['TypeScript'],
            status: 'OPEN',
            applicationCount: 0,
            viewerHasApplied: false,
          },
        ],
      },
    })
    await client.fetchQuery({
      queryKey: queryKeys.viewerRecommendationQuota(9),
      queryFn: async () => {
        throw new RequestError('AI offline', 503)
      },
    }).catch(() => {})
    await client.fetchQuery({
      queryKey: queryKeys.recommendedCandidates(42, { topK: 10, poolSize: 100, cacheOnly: true }, 9),
      queryFn: async () => {
        throw new RequestError('AI offline', 503)
      },
    }).catch(() => {})

    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <RecommendedCandidatesPage />
      </QueryClientProvider>,
    )

    expect(html).toContain('The AI service is not available right now. Please try again later.')
    expect(html).toContain('Try again')
    expect(html).not.toContain('No AI uses left')
    expect(html).not.toContain('0 of 0 AI runs left today.')
  })
})
