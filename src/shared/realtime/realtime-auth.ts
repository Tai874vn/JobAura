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
