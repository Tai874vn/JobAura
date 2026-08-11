'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/shared/stores/auth-store'

const ChatShell = dynamic(() => import('./chat-shell').then((mod) => mod.ChatShell), {
  ssr: false,
  loading: () => null,
})

export function LazyChatShell() {
  const user = useAuthStore((state) => state.user)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const [canLoadChat, setCanLoadChat] = useState(false)
  const shouldLoadChat = hasHydrated && Boolean(user)

  useEffect(() => {
    if (!shouldLoadChat) return

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined
    const requestIdle = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback.bind(window)
      : null

    if (requestIdle) {
      idleId = requestIdle(() => setCanLoadChat(true), { timeout: 2500 })
    } else {
      timeoutId = setTimeout(() => setCanLoadChat(true), 1000)
    }

    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [shouldLoadChat])

  return shouldLoadChat && canLoadChat ? <ChatShell /> : null
}
