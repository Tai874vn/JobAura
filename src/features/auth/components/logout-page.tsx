'use client'

import { useEffect, useRef, useState } from 'react'
import { authApi } from '@/shared/api/endpoints'
import { reportServerError } from '@/shared/api/query-client'
import { resetClientSession } from '@/shared/api/session-cache'
import { getErrorMessage } from '@/shared/lib/errors'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, Spinner } from '@/shared/ui'
import { useQueryClient } from '@tanstack/react-query'

/**
 * /logout. Runs once: clears chat and cached data in the browser, asks the backend to end the session, then goes
 * to the sign-in page. If the backend call fails, it shows the error so the user can try again.
 */
export function LogoutPage() {
  const hasRunRef = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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
      } catch (error) {
        reportServerError(error, 'auth:logout')
        setErrorMessage(getErrorMessage(error, 'Could not sign you out. Please try again.'))
      }
    }

    void logout()
  }, [queryClient, resetChat])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-sm px-4 text-center">
        {errorMessage ? null : <Spinner className="mx-auto h-7 w-7" />}
        <p className="mt-4 text-sm font-medium text-muted">
          {errorMessage ?? 'Signing out...'}
        </p>
        {errorMessage ? (
          <Button className="mt-4" type="button" onClick={() => window.location.reload()}>
            Retry logout
          </Button>
        ) : null}
      </div>
    </div>
  )
}
