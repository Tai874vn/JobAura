import type { Socket } from 'socket.io-client'

export function synchronizeChatConnection(socket: Socket, activeRoomId: number | null) {
  socket.emit('get-online-users')
  if (!activeRoomId) return

  // Room selection can precede the lazy socket setup. Rejoin on every connect
  // so both that first selection and reconnects restore the active conversation.
  socket.emit('join-room', { roomId: activeRoomId })
  socket.emit('mark-as-read', { roomId: activeRoomId })
}
