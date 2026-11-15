import { Manager } from 'socket.io-client'
import { describe, expect, it } from 'vitest'
import { synchronizeChatConnection } from './chat-connection'

describe('chat connection synchronization', () => {
  it('joins and marks the selected room read when the socket connects after room selection', () => {
    const socket = new Manager('https://api.example.com', { autoConnect: false }).socket('/chat')

    synchronizeChatConnection(socket, 7)

    expect(socket.sendBuffer.map((packet) => packet.data)).toEqual([
      ['get-online-users'],
      ['join-room', { roomId: 7 }],
      ['mark-as-read', { roomId: 7 }],
    ])
  })

  it('requests presence without joining a room when no conversation is selected', () => {
    const socket = new Manager('https://api.example.com', { autoConnect: false }).socket('/chat')

    synchronizeChatConnection(socket, null)

    expect(socket.sendBuffer.map((packet) => packet.data)).toEqual([['get-online-users']])
  })
})
