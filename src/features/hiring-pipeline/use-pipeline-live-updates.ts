'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useRealtimeConnection } from '@/features/auth/realtime-provider'
import { useSession } from '@/features/auth/use-session'

const pipelineTypes: ReadonlySet<string> = new Set(['APPLICATION_RECEIVED', 'APPLICATION_UPDATE', 'INTERVIEW_UPDATE'])

/** True for the 3 notification types that mean "an application or an interview changed". */
export function isPipelineNotification(raw: unknown): boolean {
  const type = (raw as { type?: unknown } | null)?.type
  return typeof type === 'string' && pipelineTypes.has(type)
}

/**
 * Mount this once for a signed-in user (the site header does). When a pipeline notification arrives on the
 * socket, every pipeline list and detail on screen reloads, so a recruiter and a candidate see the same state.
 */
export function usePipelineLiveUpdates() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const connection = useRealtimeConnection()
  const userId = user?.id

  useEffect(() => {
    if (!userId || !connection) return
    return connection.subscribe('/notifications', (socket) => {
      const onNotification = (raw: unknown) => {
        if (isPipelineNotification(raw)) void queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      }
      socket.on('notification:new', onNotification)
      return () => {
        socket.off('notification:new', onNotification)
      }
    })
  }, [connection, queryClient, userId])
}

/** Renders nothing. It lets the signed-in part of the header start the live updates (the header shows it only when signed in). */
export function PipelineLiveUpdates() {
  usePipelineLiveUpdates()
  return null
}
