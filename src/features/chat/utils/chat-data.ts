export function shouldLoadRoomMessages(
  activeRoomId: number | null,
  messagesByRoom: Record<number, unknown[]>
) {
  return Boolean(activeRoomId && !messagesByRoom[activeRoomId])
}

/**
 * Merges freshly loaded room history with any live messages already received over Socket.IO.
 * Deduplicates by message id while keeping history first and newly arrived messages at the end.
 */
export function mergeRoomMessages<T extends { id: number }>(fetched: T[], existing: T[] = []): T[] {
  if (!existing.length) return fetched
  const seen = new Set(fetched.map((message) => message.id))
  const appended = existing.filter((message) => !seen.has(message.id))
  return appended.length ? [...fetched, ...appended] : fetched
}

/** What `jobaura:open-chat` asks for: a room, or the direct room with one person. */
export type OpenChatRequest = { roomId?: number; userId?: number }

export const openChatEventName = 'jobaura:open-chat'

/** Reads the event's `detail`. A room id wins over a user id. Anything else is ignored (null). */
export function parseOpenChatRequest(detail: unknown): OpenChatRequest | null {
  const value = (detail && typeof detail === 'object' ? detail : {}) as Record<string, unknown>
  const id = (key: string) => (typeof value[key] === 'number' && Number.isInteger(value[key]) && (value[key] as number) > 0 ? (value[key] as number) : null)
  const roomId = id('roomId')
  if (roomId) return { roomId }
  const userId = id('userId')
  return userId ? { userId } : null
}
