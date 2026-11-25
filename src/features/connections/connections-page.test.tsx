import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import type { Connection } from '@/shared/schemas'
import { ConnectionsPage } from './connections-page'

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ user: { id: 1, role: 'user' }, isLoading: false, isAuthenticated: true }),
}))

const defaultParams = { page: 1, pageSize: 24, keyword: undefined }

const sampleConnection: Connection = {
  id: 10,
  status: 'ACCEPTED',
  direction: 'incoming',
  user: {
    id: 22,
    name: 'Minh Tran',
    avatar: null,
    headline: 'Product Designer',
    location: 'Da Nang',
    profileSkills: [{ id: 1, name: 'Figma', level: 'SENIOR', sortOrder: 0 }],
  },
}

function renderWithClient(client: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ConnectionsPage />
    </QueryClientProvider>,
  )
}

describe('ConnectionsPage', () => {
  it('shows the error state with a Try again button when initial load fails with no cached data', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
    })

    await client
      .fetchQuery({
        queryKey: queryKeys.connections(defaultParams, 1),
        queryFn: async () => {
          throw new Error('Connections service offline')
        },
      })
      .catch(() => {})

    const html = renderWithClient(client)

    expect(html).toContain('Could not load connections')
    expect(html).toContain('Please try again in a moment.')
    expect(html).not.toContain('Connections service offline')
    expect(html).toContain('>Try again</button>')
  })

  it('keeps the loaded connections list visible when a background refetch fails', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
    })
    const key = queryKeys.connections(defaultParams, 1)

    client.setQueryData(key, {
      content: {
        data: [sampleConnection],
        pageIndex: 1,
        pageSize: 24,
        totalRow: 1,
        totalPages: 1,
      },
    })

    await client
      .fetchQuery({
        queryKey: key,
        staleTime: 0,
        queryFn: async () => {
          throw new Error('Temporary network blip')
        },
      })
      .catch(() => {})

    expect(client.getQueryState(key)?.status).toBe('error')

    const html = renderWithClient(client)

    expect(html).toContain('Minh Tran')
    expect(html).not.toContain('Could not load connections')
  })
})
