'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Clock3, MessageCircle, UserMinus, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { chatApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, ButtonLink, ConfirmationDialog, Skeleton } from '@/shared/ui'
import type { ConnectionCommand } from '../utils/connections-data'
import { useConnectionControls } from '../hooks/use-connection-controls'

/**
 * Buttons on a profile for one person: connect / accept / cancel / remove (from the connection state, see
 * useConnectionControls) and Message, which opens the chat room.
 */
export function ConnectionActions({
  userId,
  userName,
  className,
}: {
  userId: number
  userName: string
  className?: string
}) {
  const {
    user,
    isSessionLoading,
    isSelf,
    statusQuery,
    controls,
    relationshipMutation,
    confirmingUnfriend,
    setConfirmingUnfriend,
  } = useConnectionControls(userId, userName)
  const queryClient = useQueryClient()
  const openChatForRoom = useChatStore((state) => state.openChatForRoom)

  // Data: chatApi.start → GET /api/chat/start/:userId → NestjsBE/src/modules/chat/services/chat.service.ts findPrivateRoom()
  const messageMutation = useMutation({
    mutationFn: () => chatApi.start(userId),
    onSuccess: (response) => {
      if (response.content) {
        openChatForRoom(response.content)
        void queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms(user?.id) })
      }
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

  // Keep the button slot height reserved while the session or connection status loads so actions below do not shift.
  if (isSessionLoading) {
    return <Skeleton className={cn('h-8 w-full min-w-32 rounded-lg', className)} />
  }
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
  if (isSelf) return null
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
