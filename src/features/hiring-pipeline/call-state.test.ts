import { describe, expect, it } from 'vitest'
import { callState } from './call-state'

describe('callState', () => {
  it('is preparing while the pass is loading or nothing is known yet', () => {
    expect(callState({})).toBe('preparing')
    expect(callState({ token: 'loading' })).toBe('preparing')
  })

  it('is preparing while connecting', () => {
    expect(callState({ token: 'ok', connection: 'connecting' })).toBe('preparing')
    expect(callState({ token: 'ok' })).toBe('preparing')
  })

  it('is unavailable when the pass could not be fetched', () => {
    expect(callState({ token: 'error' })).toBe('unavailable')
    expect(callState({ token: 'error', connection: 'connected' })).toBe('unavailable')
  })

  it('is live once connected', () => {
    expect(callState({ token: 'ok', connection: 'connected' })).toBe('live')
  })

  it('is unavailable when the connection failed', () => {
    expect(callState({ token: 'ok', connection: 'failed' })).toBe('unavailable')
  })

  it('is unavailable when the call was disconnected', () => {
    expect(callState({ token: 'ok', connection: 'disconnected' })).toBe('unavailable')
  })
})
