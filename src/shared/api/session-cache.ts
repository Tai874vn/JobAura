'use client'

import type { QueryClient } from '@tanstack/react-query'
import { getSessionExpiredRedirect } from '@/shared/lib/session-routing'
import type { ApiResponse, UserProfile } from '@/shared/schemas'
import { getQueryClient } from './query-client'
import { queryKeys } from './query-keys'

export const AUTH_SYNC_CHANNEL = 'jobaura:auth-reset'

function createTabId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export const SESSION_TAB_ID = createTabId()

export type SessionSyncEvent = {
  type: 'reset' | 'signin'
  userId?: number
  timestamp: number
  tabId: string
}

export function setCachedSession(
  user: UserProfile | null,
  client: QueryClient = getQueryClient(),
) {
  client.setQueryData<ApiResponse<UserProfile>>(queryKeys.me, (current) => ({
    ...current,
    content: user ?? undefined,
  }))
}

export function resetClientSession(
  client: QueryClient = getQueryClient(),
  options: { broadcast?: boolean } = {},
) {
  // Cancel in-flight private queries first so an older response settling right after logout
  // cannot write stale private data back into the cache.
  void client.cancelQueries({
    predicate: (query) => !isSessionQueryKey(query.queryKey),
  })
  client.getMutationCache().clear()
  client.removeQueries({
    predicate: (query) => !isSessionQueryKey(query.queryKey),
  })
  setCachedSession(null, client)
  if (options.broadcast !== false) {
    broadcastSessionChange('reset')
  }
}

/**
 * Tells other open tabs on the same origin that the session changed (sign-out or sign-in),
 * using BroadcastChannel (a browser messaging API between tabs) with a localStorage fallback.
 */
export function broadcastSessionChange(type: SessionSyncEvent['type'], userId?: number) {
  if (typeof window === 'undefined') return
  const payload: SessionSyncEvent = {
    type,
    userId,
    timestamp: Date.now(),
    tabId: SESSION_TAB_ID,
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL)
      channel.postMessage(payload)
      channel.close()
      return
    } catch {
      // Fall through to the storage event fallback below.
    }
  }

  try {
    window.localStorage.setItem(AUTH_SYNC_CHANNEL, JSON.stringify(payload))
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
}

/**
 * Listens for session resets or account switches from other tabs and clears this tab's
 * cache and chat store so signed-out tabs do not keep showing private data.
 */
export function subscribeSessionSync(
  client: QueryClient = getQueryClient(),
  onReset?: () => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleEvent = (event: SessionSyncEvent | null) => {
    if (!event || (event.type !== 'reset' && event.type !== 'signin')) return
    if (event.tabId === SESSION_TAB_ID) return
    onReset?.()
    resetClientSession(client, { broadcast: false })
    if (event.type === 'signin') {
      void client.invalidateQueries({ queryKey: queryKeys.me })
      return
    }
    const redirect = getSessionExpiredRedirect(window.location.pathname, window.location.search)
    if (redirect) window.location.replace(redirect)
  }

  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(AUTH_SYNC_CHANNEL)
      channel.onmessage = (message: MessageEvent<SessionSyncEvent>) => handleEvent(message.data)
    } catch {
      channel = null
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_SYNC_CHANNEL || !event.newValue) return
    try {
      handleEvent(JSON.parse(event.newValue) as SessionSyncEvent)
    } catch {
      // Ignore malformed storage payloads.
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    channel?.close()
    window.removeEventListener('storage', onStorage)
  }
}

function isSessionQueryKey(queryKey: readonly unknown[]) {
  return queryKey.length === queryKeys.me.length
    && queryKey.every((value, index) => value === queryKeys.me[index])
}
