'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, EmptyState, Skeleton, Spinner } from '@/shared/ui'
import { pipelineApi, pipelineKeys } from './api'
import { callExitHref, isAlreadyCompleted } from './call-exit'
import { callState } from './call-state'
import type { CallConnection } from './call-stage'

// The video part is loaded in the browser only (LiveKit needs the camera, the microphone and WebRTC).
const CallStage = dynamic(() => import('./call-stage'), { ssr: false })

const positive = (value: string | null) => (value && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null)

function isMissing(error: unknown) {
  return error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 403)
}

function NotFound() {
  return (
    <div className="container-page py-10">
      <EmptyState
        titleAs="h1"
        title="Call not found"
        description="This interview does not exist, or you are not part of it."
        action={<ButtonLink href="/">Back home</ButtonLink>}
      />
    </div>
  )
}

function CallLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading the call">
      <Skeleton className="h-24 w-64 rounded-xl" />
    </div>
  )
}

/**
 * The online interview call, full screen. It finds the application from ?application= (or from the upcoming
 * interviews when the link has none), fetches the call pass, and joins the room. Leave and Skip are always on
 * the page, also when the pass or the connection fails, so nobody is stuck here.
 */
export function CallScreen({ interviewId }: { interviewId: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSession()
  const userId = user?.id ?? 0
  const applicationParam = positive(searchParams.get('application'))

  // Without ?application= the upcoming list tells which application this interview belongs to.
  const upcoming = useQuery({
    queryKey: pipelineKeys.upcoming,
    queryFn: pipelineApi.upcoming,
    enabled: Boolean(user) && applicationParam === null,
    staleTime: 15_000,
  })
  const applicationId = applicationParam ?? upcoming.data?.find((row) => row.id === interviewId)?.applicationId ?? null

  const detail = useQuery({
    queryKey: pipelineKeys.detail(applicationId ?? 0),
    queryFn: () => pipelineApi.detail(applicationId as number),
    enabled: Boolean(user) && applicationId !== null,
    staleTime: 15_000,
  })

  // The pass is used once, so it is never kept for another visit or another person. The key avoids the
  // 'pipeline' prefix so list refreshes do not ask for a new pass in the middle of a call.
  const tokenQuery = useQuery({
    queryKey: ['call-token', interviewId, userId],
    queryFn: () => pipelineApi.callToken(interviewId),
    enabled: Boolean(user) && Boolean(detail.data),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const [connection, setConnection] = useState<CallConnection>('connecting')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const complete = useMutation({ mutationFn: () => pipelineApi.completeInterview(interviewId) })

  const application = detail.data
  const interview = application?.interviews.find((item) => item.id === interviewId)
  const role: 'recruiter' | 'candidate' | null = application
    ? (application.viewerRole ?? (application.applicantId === user?.id ? 'candidate' : 'recruiter'))
    : null

  if (!user) return null
  if (applicationId === null) return upcoming.isPending ? <CallLoading /> : <NotFound />
  if (detail.isError && isMissing(detail.error)) return <NotFound />
  if (detail.isPending) return <CallLoading />
  if (!application || !role || !interview) return <NotFound />

  const exit = (outcome = false) =>
    router.push(callExitHref({ role, postId: application.hiringPostId, applicationId: application.id, outcome }))

  /** The recruiter marks the interview done, then goes to the outcome dialog. A "was already done" answer is fine too. */
  const finish = async () => {
    try {
      await complete.mutateAsync()
    } catch (error) {
      if (!isAlreadyCompleted(error)) {
        toast.error(getErrorMessage(error, 'Could not mark this interview as done. Please try again.'))
        setConfirmOpen(false)
        return
      }
    }
    exit(true)
  }

  const onSkip = () => (role === 'recruiter' ? void finish() : exit())
  const onLeave = () => (role === 'recruiter' ? setConfirmOpen(true) : exit())

  const state = callState({
    token: tokenQuery.isError ? 'error' : tokenQuery.data ? 'ok' : 'loading',
    connection,
  })
  const otherName = role === 'candidate' ? application.hiringPost?.recruiter?.name : application.applicant?.name
  const busy = complete.isPending

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <h1 className="truncate font-display text-lg font-medium">{application.hiringPost?.title ?? 'Interview'}</h1>
        {otherName ? <p className="truncate text-sm text-muted">with {otherName}</p> : null}
      </header>

      <main className="flex min-h-0 flex-1 flex-col p-3 sm:p-4" aria-label="Video call">
        {state === 'unavailable' ? (
          <div className="flex flex-1 items-center justify-center">
            <p role="alert" className="text-center text-base">The call could not start.</p>
          </div>
        ) : (
          <>
            {state === 'preparing' ? (
              <p role="status" className="flex items-center justify-center gap-2 py-2 text-sm text-muted">
                <Spinner className="h-4 w-4" /> Getting the call ready
              </p>
            ) : null}
            {tokenQuery.data ? (
              <CallStage url={tokenQuery.data.url} token={tokenQuery.data.token} state={state} onConnection={setConnection} />
            ) : null}
          </>
        )}
      </main>

      <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
        <Button type="button" variant="secondary" disabled={busy} onClick={onLeave}>Leave</Button>
        <Button type="button" variant="secondary" loading={busy} onClick={onSkip}>Skip</Button>
      </footer>

      {confirmOpen ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/55 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-call-title"
            className="w-full max-w-sm rounded-lg bg-surface p-5 shadow-overlay"
          >
            <h2 id="leave-call-title" className="font-display text-lg font-medium">Mark this interview as done?</h2>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => exit(false)}>No</Button>
              <Button type="button" loading={busy} onClick={() => void finish()}>Yes</Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
