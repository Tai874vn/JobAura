import { describe, expect, it } from 'vitest'
import { proposalActions } from './proposal-actions'

const open = (turnUserId: number | null, status = 'OPEN') => ({ status, turnUserId, versions: [{ authorId: 1 }, { authorId: 2 }] }) as never

describe('proposalActions', () => {
  it('gives the person whose turn it is Accept, Counter and Decline', () => {
    expect(proposalActions(open(1), 1)).toEqual({ accept: true, counter: true, decline: true, withdraw: false })
  })
  it('gives the author of the latest version Withdraw while they wait', () => {
    expect(proposalActions(open(1), 2)).toEqual({ accept: false, counter: false, decline: false, withdraw: true })
  })
  it('gives a stranger and a closed proposal nothing', () => {
    expect(proposalActions(open(1), 3)).toEqual({ accept: false, counter: false, decline: false, withdraw: false })
    expect(proposalActions(open(null, 'ACCEPTED'), 2)).toEqual({ accept: false, counter: false, decline: false, withdraw: false })
  })
})
