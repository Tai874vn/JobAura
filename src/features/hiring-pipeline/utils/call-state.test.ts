import { describe, expect, it } from 'vitest'
import { callState, deviceNotice, isDeviceError } from './call-state'

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

describe('deviceNotice', () => {
  it('names the device that did not start', () => {
    expect(deviceNotice({})).toBeNull()
    expect(deviceNotice({ camera: true })).toBe('Your camera could not start.')
    expect(deviceNotice({ microphone: true })).toBe('Your microphone could not start.')
    expect(deviceNotice({ camera: true, microphone: true })).toBe('Your camera and microphone could not start.')
  })
})

describe('isDeviceError', () => {
  it('is true for browser camera and microphone errors only', () => {
    const denied = new Error('no')
    denied.name = 'NotAllowedError'
    expect(isDeviceError(denied)).toBe(true)
    expect(isDeviceError(new Error('could not connect'))).toBe(false)
    expect(isDeviceError('NotAllowedError')).toBe(false)
  })
})
