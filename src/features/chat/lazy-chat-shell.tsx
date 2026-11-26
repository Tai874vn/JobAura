'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { openChatEventName, parseOpenChatRequest, type OpenChatRequest } from './chat-data'

const ChatShell = dynamic(() => import('./chat-shell').then((mod) => mod.ChatShell), {
  ssr: false,
  loading: () => null,
})

export function LazyChatShell() {
  const { user, isLoading } = useSession()
  // The call screen has its own Leave and Skip at the bottom right; the Chat button would sit on top of them.
  const onCallScreen = /^\/interviews\/[^/]+\/call\/?$/.test(usePathname() ?? '')
  const [canLoadChat, setCanLoadChat] = useState(false)
  const shouldLoadChat = !isLoading && Boolean(user)
  // A Message button pressed before the widget has loaded: load it now and hand it the request.
  const [early, setEarly] = useState<OpenChatRequest | null>(null)

  useEffect(() => {
    if (!shouldLoadChat || canLoadChat) return
    const onOpen = (event: Event) => {
      const request = parseOpenChatRequest((event as CustomEvent).detail)
      if (!request) return
      setEarly(request)
      setCanLoadChat(true)
    }
    window.addEventListener(openChatEventName, onOpen)
    return () => window.removeEventListener(openChatEventName, onOpen)
  }, [shouldLoadChat, canLoadChat])

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

  return shouldLoadChat && canLoadChat && !onCallScreen ? <ChatShell initialRequest={early} /> : null
}
