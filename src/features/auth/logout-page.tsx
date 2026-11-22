'use client'

import { useEffect, useRef, useState } from 'react'
import { authApi } from '@/shared/api/endpoints'
import { resetClientSession } from '@/shared/api/session-cache'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, Spinner } from '@/shared/ui'
import { useQueryClient } from '@tanstack/react-query'

export function LogoutPage() {
  const hasRunRef = useRef(false)
  const [failed, setFailed] = useState(false)
  const queryClient = useQueryClient()
  const resetChat = useChatStore((state) => state.reset)

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    async function logout() {
      resetChat()
      resetClientSession(queryClient)

      try {
        await authApi.logout()
        resetChat()
        resetClientSession(queryClient)
        window.location.replace('/auth/login')
      } catch {
        setFailed(true)
      }
    }

    void logout()
  }, [queryClient, resetChat])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-sm px-4 text-center">
        {failed ? null : <Spinner className="mx-auto h-7 w-7" />}
        <p className="mt-4 text-sm font-medium text-muted">
          {failed ? 'Could not reach the backend logout API.' : 'Signing out...'}
        </p>
        {failed ? (
          <>
            <p className="mt-2 text-xs leading-5 text-muted">
              Restart the backend, then retry logout so the server can clear the auth cookies.
            </p>
            <Button className="mt-4" type="button" onClick={() => window.location.reload()}>
              Retry logout
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
