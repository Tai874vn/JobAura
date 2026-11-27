/**
 * Pure helper functions for the Connections feature.
 * Maps a connection status state to its display label and action buttons, and calculates the visible page numbers for pagination.
 *
 * Calls: ConnectionStatus schema
 * Used by:
 *   - features/connections/components/connect-button.tsx
 *   - features/connections/components/connections-page.tsx
 *   - features/connections/hooks/use-connection-controls.ts
 */

import type { ConnectionStatus } from '@/shared/schemas'

export type ConnectionCommand = {
  action: 'send' | 'accept' | 'decline' | 'cancel' | 'message' | 'unfriend'
  label: string
  variant: 'primary' | 'secondary'
  destructive?: boolean
}

export type ConnectionControls = {
  statusLabel: string | null
  commands: ConnectionCommand[]
}

export function connectionControlsFor(state: ConnectionStatus['state']): ConnectionControls | null {
  if (state === 'self') return null
  if (state === 'none') {
    return { statusLabel: null, commands: [{ action: 'send', label: 'Connect', variant: 'primary' }] }
  }
  if (state === 'outgoing_pending') {
    return {
      statusLabel: 'Request sent',
      commands: [{ action: 'cancel', label: 'Cancel request', variant: 'secondary' }],
    }
  }
  if (state === 'incoming_pending') {
    return {
      statusLabel: null,
      commands: [
        { action: 'accept', label: 'Accept', variant: 'primary' },
        { action: 'decline', label: 'Decline', variant: 'secondary' },
      ],
    }
  }
  return {
    statusLabel: null,
    commands: [
      { action: 'message', label: 'Message', variant: 'primary' },
      { action: 'unfriend', label: 'Unfriend', variant: 'secondary', destructive: true },
    ],
  }
}

export function pageWindow(currentPage: number, totalPages: number, maxVisible = 5) {
  const safeTotal = Math.max(1, Math.floor(totalPages))
  const safeCurrent = Math.min(Math.max(1, Math.floor(currentPage)), safeTotal)
  const visible = Math.min(Math.max(1, Math.floor(maxVisible)), safeTotal)
  const half = Math.floor(visible / 2)
  const start = Math.min(Math.max(1, safeCurrent - half), safeTotal - visible + 1)

  return Array.from({ length: visible }, (_, index) => start + index)
}
