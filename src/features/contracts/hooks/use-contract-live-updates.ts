'use client'

/**
 * Subscribes to real-time notification socket events for a signed-in user and refreshes contract and wallet queries when a proposal or contract changes.
 * Also exports a no-UI wrapper component mounted in the site header.
 *
 * Calls: useSession; useRealtimeConnection
 * Used by:
 *   - features/layout/components/site-header.tsx
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useRealtimeConnection } from '@/features/auth/components/realtime-provider'
import { useSession } from '@/features/auth/hooks/use-session'

const contractTypes: ReadonlySet<string> = new Set(['PROPOSAL_UPDATE', 'CONTRACT_UPDATE'])

/** True for the 2 notification types that mean "a proposal or a contract changed". */
export function isContractNotification(raw: unknown): boolean {
  const type = (raw as { type?: unknown } | null)?.type
  return typeof type === 'string' && contractTypes.has(type)
}

/**
 * Mount this once for a signed-in user (the site header does). When a contract notification arrives on the socket,
 * every proposal and contract on screen reloads, and so does the wallet (credits move with funding and approval).
 */
export function useContractLiveUpdates() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const connection = useRealtimeConnection()
  const userId = user?.id

  useEffect(() => {
    if (!userId || !connection) return
    return connection.subscribe('/notifications', (socket) => {
      const onNotification = (raw: unknown) => {
        if (!isContractNotification(raw)) return
        void queryClient.invalidateQueries({ queryKey: ['contracts'] })
        void queryClient.invalidateQueries({ queryKey: ['wallet'] })
      }
      socket.on('notification:new', onNotification)
      return () => {
        socket.off('notification:new', onNotification)
      }
    })
  }, [connection, queryClient, userId])
}

/** Renders nothing. It lets the signed-in part of the header start the live updates. */
export function ContractLiveUpdates() {
  useContractLiveUpdates()
  return null
}
