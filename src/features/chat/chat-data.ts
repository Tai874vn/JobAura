export function shouldLoadRoomMessages(
  activeRoomId: number | null,
  messagesByRoom: Record<number, unknown[]>
) {
  return Boolean(activeRoomId && !messagesByRoom[activeRoomId])
}
