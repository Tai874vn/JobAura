import type { Manager, Socket } from 'socket.io-client'
import { reportServerError } from '@/shared/api/query-client'

type NamespaceEntry = {
  socket: Socket
  subscribers: number
  authAttempt: number
}

type SetupSocket = (socket: Socket) => () => void
type RealtimeAuth = { token: string }

export type RealtimeConnection = ReturnType<typeof createRealtimeConnection>

export function createRealtimeConnection(
  origin: string,
  fetchAuth: () => Promise<RealtimeAuth>,
) {
  let manager: Manager | undefined
  let generation = 0
  const namespaces = new Map<string, NamespaceEntry>()
  const subscriptions = new Set<() => void>()

  function subscribe(namespace: `/${string}`, setup: SetupSocket) {
    const requestedGeneration = generation
    let cancelled = false
    let entry: NamespaceEntry | undefined
    let detach: (() => void) | undefined

    function unsubscribe() {
      if (cancelled) return
      cancelled = true
      subscriptions.delete(unsubscribe)
      detach?.()
      if (!entry || --entry.subscribers > 0) return

      // A feature releases only its namespace. Socket.IO closes the transport
      // itself when the last active namespace disconnects.
      entry.authAttempt++
      entry.socket.disconnect()
      // Never replay queued private events when this namespace is reused.
      entry.socket.sendBuffer = []
      entry.socket.receiveBuffer = []
    }

    subscriptions.add(unsubscribe)
    // Keep the Socket.IO runtime out of the initial guest bundle. Also cancel
    // late imports after logout or React Strict Mode's cleanup/setup replay.
    void import('socket.io-client').then(({ Manager }) => {
      if (cancelled || requestedGeneration !== generation) return

      // One explicit Manager owns the transport; namespaces never call io(),
      // whose cache can create extra Managers when a namespace is recreated.
      manager ??= new Manager(origin, {
        autoConnect: false,
        withCredentials: true,
        transports: ['websocket', 'polling'],
      })
      let current = namespaces.get(namespace)
      if (!current) {
        current = { socket: manager.socket(namespace), subscribers: 0, authAttempt: 0 }
        namespaces.set(namespace, current)
        const authenticatedEntry = current
        current.socket.auth = (callback) => {
          const attempt = ++authenticatedEntry.authAttempt
          const isCurrent = () => namespaces.get(namespace) === authenticatedEntry
            && authenticatedEntry.subscribers > 0
            && authenticatedEntry.authAttempt === attempt
            && authenticatedEntry.socket.active

          // Fetch a fresh short-lived ticket for each namespace handshake.
          // A late ticket must not authenticate a released or replaced socket.
          void fetchAuth()
            .then((auth) => { if (isCurrent()) callback(auth) })
            .catch((error: unknown) => {
              reportServerError(error, 'realtime:auth')
              if (isCurrent()) callback({})
            })
        }
      }

      entry = current
      entry.subscribers++
      detach = setup(entry.socket)
      // Register feature listeners before connecting so early events are kept.
      if (!entry.socket.active) entry.socket.connect()
    }).catch((error: unknown) => {
      unsubscribe()
      console.error('Realtime connection failed:', error)
    })

    return unsubscribe
  }

  function disconnect() {
    generation++
    for (const unsubscribe of [...subscriptions]) unsubscribe()
    namespaces.clear()
    manager = undefined
  }

  return { subscribe, disconnect }
}
