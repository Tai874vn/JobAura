import { describe, expect, it } from 'vitest'
import { connectionControlsFor, pageWindow } from '../connections-data'

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

describe('connection pagination', () => {
  it('keeps a stable window around the active page', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(5, 10)).toEqual([3, 4, 5, 6, 7])
    expect(pageWindow(10, 10)).toEqual([6, 7, 8, 9, 10])
  })
})
