'use client'

/**
 * Manages the shared realtime socket connection for the signed-in user across the app. It opens a connection with a realtime ticket, exposes it via useRealtimeConnection, and closes it on logout or account change.
 *
 * Calls: useSession; createRealtimeConnection; fetchRealtimeAuth; authApi.realtimeTicket
 * Used by:
 *   - app/layout.tsx
 *   - features/chat/hooks/use-chat-socket.ts
 *   - features/contracts/hooks/use-contract-live-updates.ts
 *   - features/hiring-pipeline/hooks/use-pipeline-live-updates.ts
 *   - features/notifications/components/notification-bell.tsx
 */

import { createContext, useContext, useEffect, useMemo } from 'react'
import { authApi } from '@/shared/api/endpoints'
import { env } from '@/shared/config/env'
import { fetchRealtimeAuth } from '@/shared/realtime/realtime-auth'
import { createRealtimeConnection, type RealtimeConnection } from '@/shared/realtime/realtime-connection'
import { useSession } from '../hooks/use-session'

const RealtimeContext = createContext<RealtimeConnection | null>(null)

/**
 * Opens the one socket connection (chat, notifications, live updates) for the signed-in user and closes it on
 * logout or account change. Editing your name or avatar does not reconnect.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  const userId = user?.id
  // Identity, not the whole profile, defines the connection's lifetime.
  // Editing a name/avatar must not reconnect; changing accounts must.
  const connection = useMemo(() => userId
    ? createRealtimeConnection(env.apiBaseUrl, () => fetchRealtimeAuth(authApi.realtimeTicket))
    : null, [userId])

  // Logout/account changes also invalidate pending imports and ticket replies.
  useEffect(() => () => connection?.disconnect(), [connection])

  return <RealtimeContext.Provider value={connection}>{children}</RealtimeContext.Provider>
}

export function useRealtimeConnection() {
  return useContext(RealtimeContext)
}
