'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useSession } from '@/features/auth/use-session'

const ChatShell = dynamic(() => import('./chat-shell').then((mod) => mod.ChatShell), {
  ssr: false,
  loading: () => null,
})

export function LazyChatShell() {
  const { user, isLoading } = useSession()
  const [canLoadChat, setCanLoadChat] = useState(false)
  const shouldLoadChat = !isLoading && Boolean(user)

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
