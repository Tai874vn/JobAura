import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { computeTooltipPosition, RecommendedJobsPage } from './recommended-jobs-page'

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ user: { id: 5, role: 'user' }, isLoading: false, isAuthenticated: true }),
}))

describe('computeTooltipPosition', () => {
  it('offsets the tooltip beside the pointer inside the viewport', () => {
    expect(computeTooltipPosition(100, 120, 1280, 800)).toEqual({ x: 118, y: 138 })
  })

  it('clamps coordinates to viewport margins near the bottom-right edge', () => {
    expect(computeTooltipPosition(1200, 760, 1280, 800)).toEqual({
      x: 1280 - 332 - 12,
      y: 800 - 260 - 12,
    })
  })

  it('clamps negative coordinates to the top-left margin', () => {
    expect(computeTooltipPosition(-50, -30, 1280, 800)).toEqual({ x: 12, y: 12 })
  })
})

describe('RecommendedJobsPage', () => {
  it('keeps the start card mounted and shows card skeletons while previous matches load', () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <RecommendedJobsPage />
      </QueryClientProvider>,
    )

    expect(html).toContain('Run job matching when you are ready')
    expect(html).toContain('Loading your previous matches')
    expect(html).toContain('motion-safe:animate-pulse')
  })
})
