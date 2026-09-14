import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RightFeedRail } from './feed-rails'

describe('RightFeedRail', () => {
  it('does not mount desktop-only rail content during server rendering', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <RightFeedRail />
      </QueryClientProvider>
    )

    expect(html).toBe('')
  })
})
