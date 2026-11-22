'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock3, MessageCircle, UserMinus, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { chatApi, connectionsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, ButtonLink, ConfirmationDialog } from '@/shared/ui'
import { connectionControlsFor, type ConnectionCommand } from './connections-data'

export function ConnectionActions({
  userId,
  userName,
  className,
}: {
  userId: number
  userName: string
  className?: string
}) {
  const [confirmingUnfriend, setConfirmingUnfriend] = useState(false)
  const queryClient = useQueryClient()
  const { user, isLoading: isSessionLoading } = useSession()
  const openChatForRoom = useChatStore((state) => state.openChatForRoom)
  const statusQuery = useQuery({
    queryKey: queryKeys.connectionStatus(userId),
    queryFn: () => connectionsApi.status(userId),
    enabled: Boolean(user),
  })
  const status = statusQuery.data?.content
  const controls = status ? connectionControlsFor(status.state) : null

  const refreshConnections = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.connectionStatus(userId) }),
      queryClient.invalidateQueries({ queryKey: ['connections'] }),
    ])
  }

  const relationshipMutation = useMutation({
    mutationFn: async (action: Exclude<ConnectionCommand['action'], 'message'>) => {
      if (action === 'send') return connectionsApi.send(userId)
      if (!status?.connectionId) throw new Error('Connection could not be found')
      if (action === 'accept') return connectionsApi.accept(status.connectionId)
      return connectionsApi.remove(status.connectionId)
    },
    onSuccess: async (_response, action) => {
      await refreshConnections()
      if (action === 'unfriend') {
        setConfirmingUnfriend(false)
        toast.success(`You and ${userName} are no longer connected`)
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

  const messageMutation = useMutation({
    mutationFn: () => chatApi.start(userId),
    onSuccess: (response) => {
      if (response.content) openChatForRoom(response.content)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not open conversation')),
  })

  function runCommand(command: ConnectionCommand) {
    if (command.action === 'message') {
      messageMutation.mutate()
      return
    }
    if (command.action === 'unfriend') {
      setConfirmingUnfriend(true)
      return
    }
    relationshipMutation.mutate(command.action)
  }

  if (isSessionLoading) return null
  if (!user) {
    return (
      <ButtonLink
        className={cn('w-full', className)}
        href={`/auth/login?next=${encodeURIComponent(`/profile/${userId}`)}`}
        size="sm"
        variant="secondary"
      >
        <UserPlus className="h-4 w-4" /> Sign in to connect
      </ButtonLink>
    )
  }
  if (statusQuery.isPending) {
    return <Button className={className} size="sm" variant="secondary" loading>Loading connection</Button>
  }
  if (statusQuery.isError) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <span role="status" className="text-xs text-muted">Connection status unavailable.</span>
        <Button size="sm" variant="secondary" loading={statusQuery.isFetching} onClick={() => statusQuery.refetch()}>Retry</Button>
      </div>
    )
  }
  if (!controls) return null

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {controls.statusLabel ? (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 text-xs font-medium text-muted">
            <Clock3 className="h-3.5 w-3.5" /> {controls.statusLabel}
          </span>
        ) : null}
        {controls.commands.map((command) => {
          const pending = command.action === 'message'
            ? messageMutation.isPending
            : relationshipMutation.isPending && relationshipMutation.variables === command.action
          const Icon = commandIcon(command.action)
          return (
            <Button
              key={command.action}
              type="button"
              size="sm"
              variant={command.destructive ? 'danger' : command.variant}
              onClick={() => runCommand(command)}
              loading={pending}
              disabled={relationshipMutation.isPending || messageMutation.isPending}
            >
              <Icon className="h-4 w-4" /> {command.label}
            </Button>
          )
        })}
      </div>
      <ConfirmationDialog
        open={confirmingUnfriend}
        title={`Unfriend ${userName}?`}
        description={`This removes ${userName} from your connections. You can send another request later.`}
        confirmLabel="Unfriend"
        pending={relationshipMutation.isPending && relationshipMutation.variables === 'unfriend'}
        onCancel={() => setConfirmingUnfriend(false)}
        onConfirm={() => relationshipMutation.mutate('unfriend')}
      />
    </>
  )
}

function commandIcon(action: ConnectionCommand['action']) {
  if (action === 'send') return UserPlus
  if (action === 'accept') return Check
  if (action === 'message') return MessageCircle
  if (action === 'decline') return X
  return UserMinus
}
