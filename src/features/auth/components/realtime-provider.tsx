'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { authApi } from '@/shared/api/endpoints'
import { env } from '@/shared/config/env'
import { fetchRealtimeAuth } from '@/shared/realtime/realtime-auth'
import { createRealtimeConnection, type RealtimeConnection } from '@/shared/realtime/realtime-connection'
import { useSession } from '../hooks/use-session'

const RealtimeContext = createContext<RealtimeConnection | null>(null)

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
