/**
 * Pure helpers for the online interview video call state and media device errors.
 * Maps token and connection status to a screen state and builds plain-English notices when a camera or microphone fails to start.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/hiring-pipeline/components/interview-call/call-screen.tsx
 *   - features/hiring-pipeline/components/interview-call/call-stage.tsx
 */

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

/** The browser's names for "no camera or microphone, or you said no". These end one device, not the whole call. */
const deviceErrorNames = new Set([
  'NotAllowedError',
  'NotFoundError',
  'NotReadableError',
  'OverconstrainedError',
  'SecurityError',
  'AbortError',
])

export function isDeviceError(error: unknown): boolean {
  return error instanceof Error && deviceErrorNames.has(error.name)
}

/** One plain line for the devices that did not start, or null when both work. */
export function deviceNotice(failed: { camera?: boolean; microphone?: boolean }): string | null {
  if (failed.camera && failed.microphone) return 'Your camera and microphone could not start.'
  if (failed.camera) return 'Your camera could not start.'
  if (failed.microphone) return 'Your microphone could not start.'
  return null
}
