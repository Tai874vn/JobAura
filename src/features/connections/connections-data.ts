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
