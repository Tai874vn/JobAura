/**
 * Auth helper for the realtime Socket.IO connection. Calls the given ticket fetcher and pulls out the short-lived token, throwing an error if none is returned.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/auth/components/realtime-provider.tsx
 */

type RealtimeTicketResponse = {
  content?: {
    token?: string
  }
}

export async function fetchRealtimeAuth(
  fetchTicket: () => Promise<RealtimeTicketResponse>
) {
  const response = await fetchTicket()
  const token = response.content?.token
  if (!token) throw new Error('Realtime ticket was not returned')
  return { token }
}
