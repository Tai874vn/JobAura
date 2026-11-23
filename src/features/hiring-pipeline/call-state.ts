export type CallState = 'preparing' | 'live' | 'unavailable'

/**
 * What the call screen shows, from two facts: did the pass (token) load, and how is the connection.
 * - preparing: still loading or connecting
 * - live: connected, the two people can talk
 * - unavailable: no pass, or the connection failed or ended (the screen then shows one plain sentence)
 */
export function callState(input: {
  token?: 'loading' | 'ok' | 'error'
  connection?: 'connecting' | 'connected' | 'failed' | 'disconnected'
}): CallState {
  if (input.token === 'error') return 'unavailable'
  if (input.token !== 'ok') return 'preparing'
  if (input.connection === 'failed' || input.connection === 'disconnected') return 'unavailable'
  if (input.connection === 'connected') return 'live'
  return 'preparing'
}
