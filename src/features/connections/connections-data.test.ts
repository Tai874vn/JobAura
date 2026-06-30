import { describe, expect, it } from 'vitest'
import { connectionControlsFor } from './connections-data'

describe('connection actions', () => {
  it('maps every relationship state to explicit commands', () => {
    expect(connectionControlsFor('self')).toBeNull()
    expect(connectionControlsFor('none')).toMatchObject({
      statusLabel: null,
      commands: [{ action: 'send', label: 'Connect' }],
    })
    expect(connectionControlsFor('outgoing_pending')).toMatchObject({
      statusLabel: 'Request sent',
      commands: [{ action: 'cancel', label: 'Cancel request' }],
    })
    expect(connectionControlsFor('incoming_pending')).toMatchObject({
      statusLabel: null,
      commands: [
        { action: 'accept', label: 'Accept' },
        { action: 'decline', label: 'Decline' },
      ],
    })
    expect(connectionControlsFor('connected')).toMatchObject({
      statusLabel: null,
      commands: [
        { action: 'message', label: 'Message' },
        { action: 'unfriend', label: 'Unfriend', destructive: true },
      ],
    })
  })
})
