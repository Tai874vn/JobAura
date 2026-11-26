import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import { NotificationBell } from './notification-bell'

const apiMocks = vi.hoisted(() => ({
  list: vi.fn(),
  unreadCount: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ user: { id: 12, role: 'user' }, isLoading: false, isAuthenticated: true }),
}))

vi.mock('@/features/auth/components/realtime-provider', () => ({
  useRealtimeConnection: () => null,
}))

vi.mock('@/shared/api/endpoints', () => ({
  chatApi: { room: vi.fn() },
  notificationsApi: {
    list: apiMocks.list,
    unreadCount: apiMocks.unreadCount,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

describe('NotificationBell', () => {
  beforeEach(() => {
    apiMocks.list.mockClear()
    apiMocks.unreadCount.mockClear()
  })

  it('shows the unread badge while closed and keeps the notification list query disabled until opened', () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    client.setQueryData(queryKeys.notificationUnreadCount(12), { content: { unreadCount: 7 } })

    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <NotificationBell />
      </QueryClientProvider>,
    )

    expect(html).toContain('>7<')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('id="notification-panel"')
    expect(apiMocks.list).not.toHaveBeenCalled()
    expect(client.getQueryState(queryKeys.notifications(12))?.fetchStatus).toBe('idle')
    expect(client.getQueryState(queryKeys.notifications(12))?.dataUpdateCount).toBe(0)
  })

  it('caps the badge text at 99+', () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    client.setQueryData(queryKeys.notificationUnreadCount(12), { content: { unreadCount: 142 } })

    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <NotificationBell />
      </QueryClientProvider>,
    )

    expect(html).toContain('>99+<')
  })
})
