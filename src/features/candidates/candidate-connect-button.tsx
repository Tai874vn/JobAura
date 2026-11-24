'use client'

import { Check, ChevronDown, Clock3, UserMinus, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useConnectionControls } from '@/features/connections/use-connection-controls'
import { cn } from '@/shared/lib/utils'
import { ConfirmationDialog } from '@/shared/ui'

const secondaryButton =
  'interaction inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50'

const primaryTintButton =
  'interaction inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-[#e9f3ec] px-4 text-sm font-semibold text-primary hover:bg-[#d9ecdf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50'

/**
 * Connect control for one candidate result card.
 * Shares status loading, mutations, and toasts with ConnectionActions via useConnectionControls,
 * without adding a second Message button when already connected (the card already has Message).
 */
export function CandidateConnectButton({ userId, userName }: { userId: number; userName: string }) {
  const {
    user,
    isSelf,
    statusQuery,
    status,
    controls,
    relationshipMutation,
    confirmingUnfriend,
    setConfirmingUnfriend,
  } = useConnectionControls(userId, userName)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  if (!user || isSelf) return null

  if (statusQuery.isPending) {
    return (
      <button type="button" disabled className={primaryTintButton}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Connect
      </button>
    )
  }

  if (statusQuery.isError) {
    return (
      <button
        type="button"
        onClick={() => void statusQuery.refetch()}
        disabled={statusQuery.isFetching}
        className={secondaryButton}
      >
        Retry connect
      </button>
    )
  }

  if (!status || !controls) return null

  if (status.state === 'connected') {
    const unfriendLabel =
      controls.commands.find((command) => command.action === 'unfriend')?.label ?? 'Unfriend'

    return (
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          disabled={relationshipMutation.isPending}
          className={primaryTintButton}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Connected
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-150', menuOpen && 'rotate-180')}
            aria-hidden="true"
          />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            aria-label={`Connection actions for ${userName}`}
            className="menu-drop absolute left-0 top-[calc(100%+6px)] z-30 min-w-[160px] rounded-xl border border-border bg-surface p-1.5 shadow-float sm:left-auto sm:right-0"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                setConfirmingUnfriend(true)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <UserMinus className="h-4 w-4" aria-hidden="true" />
              {unfriendLabel}
            </button>
          </div>
        ) : null}

        <ConfirmationDialog
          open={confirmingUnfriend}
          title={`Unfriend ${userName}?`}
          description={`This removes ${userName} from your connections. You can send another request later.`}
          confirmLabel="Unfriend"
          pending={relationshipMutation.isPending && relationshipMutation.variables === 'unfriend'}
          onCancel={() => setConfirmingUnfriend(false)}
          onConfirm={() => relationshipMutation.mutate('unfriend')}
        />
      </div>
    )
  }

  if (status.state === 'outgoing_pending') {
    return (
      <button
        type="button"
        onClick={() => relationshipMutation.mutate('cancel')}
        disabled={relationshipMutation.isPending}
        title="Cancel connection request"
        className={secondaryButton}
      >
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        {relationshipMutation.isPending ? 'Cancelling…' : (controls.statusLabel ?? 'Request sent')}
      </button>
    )
  }

  if (status.state === 'incoming_pending') {
    return (
      <>
        <button
          type="button"
          onClick={() => relationshipMutation.mutate('accept')}
          disabled={relationshipMutation.isPending}
          className={primaryTintButton}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Accept
        </button>
        <button
          type="button"
          onClick={() => relationshipMutation.mutate('decline')}
          disabled={relationshipMutation.isPending}
          className={cn(secondaryButton, 'px-3')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Decline
        </button>
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => relationshipMutation.mutate('send')}
      disabled={relationshipMutation.isPending}
      className={primaryTintButton}
    >
      <UserPlus className="h-4 w-4" aria-hidden="true" />
      {relationshipMutation.isPending ? 'Sending…' : 'Connect'}
    </button>
  )
}
