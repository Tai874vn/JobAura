'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/hooks/use-session'
import { connectionsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import { connectionControlsFor, type ConnectionCommand } from './connections-data'

export type ConnectionRelationshipAction = Exclude<ConnectionCommand['action'], 'message'>

/**
 * Shared connection controls for one user.
 * Loads the status query, maps it through connectionControlsFor, and runs the
 * send, accept, cancel, decline, and unfriend mutations with the same toasts.
 */
export function useConnectionControls(userId: number, userName?: string) {
  const [confirmingUnfriend, setConfirmingUnfriend] = useState(false)
  const queryClient = useQueryClient()
  const { user, isLoading: isSessionLoading } = useSession()
  const isSelf = Boolean(user && user.id === userId)

  const statusQuery = useQuery({
    queryKey: queryKeys.connectionStatus(userId, user?.id),
    queryFn: () => connectionsApi.status(userId),
    enabled: Boolean(user && !isSelf),
  })

  const status = statusQuery.data?.content
  const controls = status ? connectionControlsFor(status.state) : null

  const refreshConnections = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.connectionStatus(userId, user?.id) }),
      queryClient.invalidateQueries({ queryKey: ['connections'] }),
    ])
  }

  const relationshipMutation = useMutation({
    mutationFn: async (action: ConnectionRelationshipAction) => {
      if (action === 'send') return connectionsApi.send(userId)
      if (!status?.connectionId) throw new Error('Connection could not be found')
      if (action === 'accept') return connectionsApi.accept(status.connectionId)
      return connectionsApi.remove(status.connectionId)
    },
    onSuccess: async (_response, action) => {
      await refreshConnections()
      if (action === 'unfriend') {
        setConfirmingUnfriend(false)
        toast.success(`You and ${userName || 'this user'} are no longer connected`)
      } else if (action === 'send') {
        toast.success('Connection request sent')
      } else if (action === 'accept') {
        toast.success('Connection request accepted')
      } else {
        toast.success(action === 'cancel' ? 'Connection request cancelled' : 'Connection request declined')
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update connection')),
  })

  return {
    user,
    isSessionLoading,
    isSelf,
    statusQuery,
    status,
    controls,
    relationshipMutation,
    confirmingUnfriend,
    setConfirmingUnfriend,
  }
}
