import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryKeys, walletKeys } from './query-keys'
import {
  AUTH_SYNC_CHANNEL,
  SESSION_TAB_ID,
  broadcastSessionChange,
  resetClientSession,
  setCachedSession,
  subscribeSessionSync,
  type SessionSyncEvent,
} from './session-cache'
import type { ApiResponse, UserProfile } from '@/shared/schemas'

describe('session cache', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores and clears the authenticated user in one cache entry', () => {
    const client = new QueryClient()
    const user = { id: 1, name: 'Jane', email: 'jane@example.com' } as UserProfile

    setCachedSession(user, client)
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toEqual(user)

    setCachedSession(null, client)
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toBeUndefined()
  })

  it('removes private query data when the client session ends', () => {
    const client = new QueryClient()
    client.setQueryData(queryKeys.savedPosts(1), { content: { data: [{ id: 99 }] } })
    client.setQueryData(queryKeys.notifications(1), { content: { data: [{ id: 42 }] } })

    resetClientSession(client)

    expect(client.getQueryData(queryKeys.savedPosts(1))).toBeUndefined()
    expect(client.getQueryData(queryKeys.notifications(1))).toBeUndefined()
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toBeUndefined()
  })

  it('removes the wallet balance and ledger when the client session ends', () => {
    const client = new QueryClient()
    client.setQueryData(walletKeys.summary(1), { available: 1250 })
    client.setQueryData(walletKeys.ledger({ viewerId: 1, pageSize: 20 }), { pages: [] })

    resetClientSession(client)

    expect(client.getQueryData(walletKeys.summary(1))).toBeUndefined()
    expect(client.getQueryData(walletKeys.ledger({ viewerId: 1, pageSize: 20 }))).toBeUndefined()
  })

  it('removes cached mutation results when the client session ends', async () => {
    const client = new QueryClient()
    const mutation = client.getMutationCache().build(client, {
      mutationFn: async () => ({ privateResult: true }),
    })
    await mutation.execute(undefined)

    resetClientSession(client)

    expect(client.getMutationCache().getAll()).toHaveLength(0)
  })

  it('cancels in-flight non-session queries when resetting the session', () => {
    const client = new QueryClient()
    const cancelSpy = vi.spyOn(client, 'cancelQueries')

    resetClientSession(client)

    expect(cancelSpy).toHaveBeenCalledOnce()
    const predicate = cancelSpy.mock.calls[0]?.[0]?.predicate
    expect(predicate?.({ queryKey: queryKeys.me } as never)).toBe(false)
    expect(predicate?.({ queryKey: queryKeys.savedPosts(1) } as never)).toBe(true)
  })

  it('settles an active session observer when the session is reset during its request', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const observer = new QueryObserver<ApiResponse<UserProfile>>(client, {
      queryKey: queryKeys.me,
      queryFn: async () => {
        resetClientSession(client)
        throw new Error('Unauthorized')
      },
    })
    const unsubscribe = observer.subscribe(() => undefined)

    await vi.waitFor(() => expect(observer.getCurrentResult().isPending).toBe(false))
    expect(observer.getCurrentResult().data?.content).toBeUndefined()

    unsubscribe()
  })

  it('ignores own-tab BroadcastChannel signin and reset messages so a signing-in tab keeps its session', () => {
    const channels: FakeBroadcastChannel[] = []
    class FakeBroadcastChannel {
      name: string
      onmessage: ((event: MessageEvent<SessionSyncEvent>) => void) | null = null
      closed = false
      sent: SessionSyncEvent[] = []
      constructor(name: string) {
        this.name = name
        channels.push(this)
      }
      postMessage(data: SessionSyncEvent) {
        this.sent.push(data)
        for (const other of channels) {
          if (other !== this && !other.closed && other.name === this.name) {
            other.onmessage?.({ data } as MessageEvent<SessionSyncEvent>)
          }
        }
      }
      close() {
        this.closed = true
      }
    }

    const replace = vi.fn()
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
    vi.stubGlobal('window', {
      location: { pathname: '/settings', search: '?section=resume', replace },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const client = new QueryClient()
    const user = { id: 7, name: 'Jane', email: 'jane@example.com' } as UserProfile
    setCachedSession(user, client)
    client.setQueryData(queryKeys.savedPosts(7), { content: { data: [{ id: 1 }] } })
    const onReset = vi.fn()
    const unsubscribe = subscribeSessionSync(client, onReset)

    // Same-tab broadcast delivers to the subscriber's channel object, but carries SESSION_TAB_ID and must be ignored.
    broadcastSessionChange('signin', user.id)
    broadcastSessionChange('reset')

    expect(onReset).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toEqual(user)
    expect(client.getQueryData(queryKeys.savedPosts(7))).toEqual({ content: { data: [{ id: 1 }] } })
    expect(channels.some((channel) => channel.sent.some((msg) => msg.tabId === SESSION_TAB_ID))).toBe(true)

    // A message from another tab (different tabId) is processed normally.
    const otherTabChannel = new FakeBroadcastChannel(AUTH_SYNC_CHANNEL)
    otherTabChannel.postMessage({ type: 'reset', timestamp: Date.now(), tabId: 'another-tab-id' })

    expect(onReset).toHaveBeenCalledOnce()
    expect(client.getQueryData(queryKeys.savedPosts(7))).toBeUndefined()
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toBeUndefined()
    expect(replace).toHaveBeenCalledWith('/auth/login?next=%2Fsettings%3Fsection%3Dresume')
    expect(channels.some((channel) => channel.name === AUTH_SYNC_CHANNEL)).toBe(true)

    otherTabChannel.close()
    unsubscribe()
  })

  it('ignores own-tab localStorage fallback events and processes events from other tabs', () => {
    const listeners = new Map<string, Set<(event: StorageEvent) => void>>()
    const stored = new Map<string, string>()
    const replace = vi.fn()

    vi.stubGlobal('BroadcastChannel', undefined)
    vi.stubGlobal('window', {
      location: { pathname: '/settings', search: '', replace },
      localStorage: {
        setItem: (key: string, value: string) => stored.set(key, value),
      },
      addEventListener: (type: string, fn: (event: StorageEvent) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set())
        listeners.get(type)!.add(fn)
      },
      removeEventListener: (type: string, fn: (event: StorageEvent) => void) => {
        listeners.get(type)?.delete(fn)
      },
    })

    const client = new QueryClient()
    const user = { id: 9, name: 'Alex', email: 'alex@example.com' } as UserProfile
    setCachedSession(user, client)
    client.setQueryData(queryKeys.savedPosts(9), { content: { data: [{ id: 5 }] } })
    const onReset = vi.fn()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const unsubscribe = subscribeSessionSync(client, onReset)

    broadcastSessionChange('signin', user.id)
    const serialized = stored.get(AUTH_SYNC_CHANNEL)
    expect(serialized).toBeTruthy()
    expect(JSON.parse(serialized!).tabId).toBe(SESSION_TAB_ID)

    // Own-tab storage event carrying SESSION_TAB_ID must be ignored.
    for (const listener of listeners.get('storage') ?? []) {
      listener({ key: AUTH_SYNC_CHANNEL, newValue: serialized } as StorageEvent)
    }
    expect(onReset).not.toHaveBeenCalled()
    expect(client.getQueryData<ApiResponse<UserProfile>>(queryKeys.me)?.content).toEqual(user)

    // Cross-tab signin storage event clears cache and invalidates me without redirecting to login.
    const otherTabPayload = JSON.stringify({
      type: 'signin',
      userId: 10,
      timestamp: Date.now(),
      tabId: 'other-tab-id',
    })
    for (const listener of listeners.get('storage') ?? []) {
      listener({ key: AUTH_SYNC_CHANNEL, newValue: otherTabPayload } as StorageEvent)
    }
    expect(onReset).toHaveBeenCalledOnce()
    expect(client.getQueryData(queryKeys.savedPosts(9))).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.me })
    expect(replace).not.toHaveBeenCalled()

    unsubscribe()
  })
})
