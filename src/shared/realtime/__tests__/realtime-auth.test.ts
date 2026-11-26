import { describe, expect, it, vi } from 'vitest'
import { fetchRealtimeAuth } from '../realtime-auth'

describe('fetchRealtimeAuth', () => {
  it('returns the short-lived ticket as Socket.IO auth data', async () => {
    const fetchTicket = vi.fn().mockResolvedValue({
      content: { token: 'socket-token', expiresInSeconds: 60 },
    })

    await expect(fetchRealtimeAuth(fetchTicket)).resolves.toEqual({ token: 'socket-token' })
  })

  it('rejects a ticket response without a token', async () => {
    await expect(fetchRealtimeAuth(async () => ({ content: undefined }))).rejects.toThrow(
      'Realtime ticket was not returned'
    )
  })
})
