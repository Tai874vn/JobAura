import { Manager, type Socket } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRealtimeConnection } from '../realtime-connection'

type Connection = ReturnType<typeof createRealtimeConnection>

const connections: Connection[] = []

function deliverMessage(socket: Socket, message: string) {
  socket.listeners('test-message').forEach((listener) => listener(message))
}

function createConnection(fetchAuth = async () => ({ token: 'realtime-ticket' })) {
  const connection = createRealtimeConnection('https://api.example.com', fetchAuth)
  connections.push(connection)
  return connection
}

async function subscribe(connection: Connection, namespace: `/${string}`) {
  let socket: Socket | undefined
  const messages: string[] = []
  const unsubscribe = connection.subscribe(namespace, (current) => {
    socket = current
    const onMessage = (message: string) => messages.push(message)
    current.on('test-message', onMessage)
    return () => current.off('test-message', onMessage)
  })
  await vi.waitFor(() => expect(socket).toBeDefined())
  return { socket: socket!, messages, unsubscribe }
}

beforeEach(() => {
  // Keep the real Manager and namespace sockets; replace only network opening.
  vi.spyOn(Manager.prototype, 'open').mockImplementation(function (this: Manager) {
    return this
  })
})

afterEach(() => {
  connections.splice(0).forEach((connection) => connection.disconnect())
  vi.restoreAllMocks()
})

describe('realtime connection lifecycle', () => {
  it('shares one Manager between chat and notification namespaces', async () => {
    const connection = createConnection()
    const chat = await subscribe(connection, '/chat')
    const notifications = await subscribe(connection, '/notifications')

    expect(chat.socket).not.toBe(notifications.socket)
    expect(chat.socket.io).toBe(notifications.socket.io)
    expect(chat.socket.active).toBe(true)
    expect(notifications.socket.active).toBe(true)
  })

  it('reuses the namespace socket after a component remount without old listeners', async () => {
    const connection = createConnection()
    const first = await subscribe(connection, '/chat')
    first.unsubscribe()
    const second = await subscribe(connection, '/chat')

    deliverMessage(second.socket, 'hello')

    expect(second.socket).toBe(first.socket)
    expect(first.messages).toEqual([])
    expect(second.messages).toEqual(['hello'])
  })

  it('does not disconnect another subscriber to the same namespace', async () => {
    const connection = createConnection()
    const first = await subscribe(connection, '/notifications')
    const second = await subscribe(connection, '/notifications')

    first.unsubscribe()
    first.unsubscribe()
    deliverMessage(second.socket, 'still subscribed')

    expect(first.socket).toBe(second.socket)
    expect(second.socket.active).toBe(true)
    expect(first.messages).toEqual([])
    expect(second.messages).toEqual(['still subscribed'])

    second.unsubscribe()
    expect(second.socket.active).toBe(false)
  })

  it('disconnects only the released namespace while another remains active', async () => {
    const connection = createConnection()
    const chat = await subscribe(connection, '/chat')
    const notifications = await subscribe(connection, '/notifications')

    chat.unsubscribe()

    expect(chat.socket.active).toBe(false)
    expect(notifications.socket.active).toBe(true)
  })

  it('cancels a subscription cleaned up before the lazy client has loaded', async () => {
    const connection = createConnection()
    const setup = vi.fn()
    connection.subscribe('/chat', setup)()

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(setup).not.toHaveBeenCalled()
  })

  it('cleans all subscriptions and buffers when the authenticated session ends', async () => {
    const connection = createConnection()
    const chat = await subscribe(connection, '/chat')
    const notifications = await subscribe(connection, '/notifications')
    chat.socket.emit('send-message', { roomId: 1, content: 'unsent private message' })

    connection.disconnect()
    deliverMessage(chat.socket, 'old session')
    deliverMessage(notifications.socket, 'old session')

    expect(chat.socket.active).toBe(false)
    expect(notifications.socket.active).toBe(false)
    expect(chat.socket.sendBuffer).toEqual([])
    expect(chat.messages).toEqual([])
    expect(notifications.messages).toEqual([])

    const nextSession = await subscribe(connection, '/chat')
    expect(nextSession.socket.io).not.toBe(chat.socket.io)
  })

  it('invalidates pending subscriptions on disconnect but supports Strict Mode resubscription', async () => {
    const connection = createConnection()
    const staleSetup = vi.fn()
    connection.subscribe('/chat', staleSetup)
    connection.disconnect()

    const current = await subscribe(connection, '/chat')

    expect(staleSetup).not.toHaveBeenCalled()
    expect(current.socket.active).toBe(true)
  })

  it('fetches fresh authentication data for every namespace handshake', async () => {
    let ticket = 0
    const connection = createConnection(async () => ({ token: `ticket-${++ticket}` }))
    const chat = await subscribe(connection, '/chat')
    const notifications = await subscribe(connection, '/notifications')

    async function authenticate(socket: Socket) {
      return new Promise((resolve) => {
        if (typeof socket.auth !== 'function') throw new Error('Expected an auth callback')
        socket.auth(resolve)
      })
    }

    await expect(authenticate(chat.socket)).resolves.toEqual({ token: 'ticket-1' })
    await expect(authenticate(notifications.socket)).resolves.toEqual({ token: 'ticket-2' })
    await expect(authenticate(chat.socket)).resolves.toEqual({ token: 'ticket-3' })
  })

  it.each(['unsubscribe', 'disconnect'] as const)('ignores a late ticket after %s', async (action) => {
    const pending: Array<(auth: { token: string }) => void> = []
    const connection = createConnection(() => new Promise((resolve) => pending.push(resolve)))
    const first = await subscribe(connection, '/chat')
    const oldCallback = vi.fn()
    if (typeof first.socket.auth !== 'function') throw new Error('Expected an auth callback')
    first.socket.auth(oldCallback)
    if (action === 'disconnect') connection.disconnect()
    else first.unsubscribe()

    const second = await subscribe(connection, '/chat')
    const currentCallback = vi.fn()
    if (typeof second.socket.auth !== 'function') throw new Error('Expected an auth callback')
    second.socket.auth(currentCallback)
    pending[0]({ token: 'stale-ticket' })
    pending[1]({ token: 'current-ticket' })

    await vi.waitFor(() => expect(currentCallback).toHaveBeenCalledWith({ token: 'current-ticket' }))
    expect(oldCallback).not.toHaveBeenCalled()
  })
})
