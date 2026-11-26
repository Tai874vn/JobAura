'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/hooks/use-session'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, DialogPortal, EmptyState, Spinner, useDialogFocus } from '@/shared/ui'
import { pipelineApi, pipelineKeys } from '../../api'
import { callExitHref, fallbackExitHref, isAlreadyCompleted } from '../../utils/call-exit'
import { CallLoading, CallStageSkeleton } from './call-loading'
import { callState } from '../../utils/call-state'
import type { CallConnection } from './call-stage'

// The video part is loaded in the browser only (LiveKit needs the camera, the microphone and WebRTC).
const CallStage = dynamic(() => import('./call-stage'), { ssr: false, loading: CallStageSkeleton })

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
    queryKey: pipelineKeys.upcoming(user?.id),
    queryFn: pipelineApi.upcoming,
    enabled: Boolean(user) && applicationParam === null,
    staleTime: 15_000,
  })
  const applicationId = applicationParam ?? upcoming.data?.find((row) => row.id === interviewId)?.applicationId ?? null

  const detail = useQuery({
    queryKey: pipelineKeys.detail(applicationId ?? 0, user?.id),
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
  const queryClient = useQueryClient()

  // Start downloading the LiveKit video bundle as soon as the interview detail loads, in parallel with the call pass.
  useEffect(() => {
    if (detail.data) void import('./call-stage')
  }, [detail.data])
  const complete = useMutation({
    mutationFn: () => pipelineApi.completeInterview(interviewId),
    onSuccess: (done) => {
      // The finished interview must not stay in the lists as "Join call".
      queryClient.setQueryData(pipelineKeys.detail(done.id, user?.id), done)
      void queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      void queryClient.invalidateQueries({ queryKey: ['hiring-posts'] })
    },
  })

  const application = detail.data
  const interview = application?.interviews.find((item) => item.id === interviewId)
  // Without the application, the signed-in account tells the side: a plain user is the candidate.
  const fromSession = user?.role === 'user' ? 'candidate' : 'recruiter'
  const role: 'recruiter' | 'candidate' = application
    ? (application.viewerRole ?? (application.applicantId === user?.id ? 'candidate' : 'recruiter'))
    : fromSession

  if (!user) return <CallLoading />
  // Only a real "not found" or "not yours" answer says so. Any other failure keeps Leave and Skip on the page.
  if (isMissing(upcoming.error) || isMissing(detail.error)) return <NotFound />
  const lookupFailed = upcoming.isError || detail.isError
  if (!lookupFailed) {
    if (applicationId === null) return upcoming.isPending ? <CallLoading /> : <NotFound />
    if (detail.isPending) return <CallLoading />
    if (!application || !interview) return <NotFound />
  }

  /** Leaves the page. `done` is the application from a finished "complete", used when the page could not read it. */
  const exit = (outcome = false, done?: { id: number; hiringPostId: number }) => {
    const known = application ?? done
    if (known) router.push(callExitHref({ role, postId: known.hiringPostId, applicationId: known.id, outcome }))
    else if (applicationId !== null && role === 'candidate') router.push(callExitHref({ role, postId: 0, applicationId }))
    else router.push(fallbackExitHref(role))
  }

  /** The recruiter marks the interview done, then goes to the outcome dialog. A "was already done" answer is fine too. */
  const finish = async () => {
    try {
      exit(true, await complete.mutateAsync())
    } catch (error) {
      if (isAlreadyCompleted(error) || !application) exit(true)
      else {
        toast.error(getErrorMessage(error, 'Could not mark this interview as done. Please try again.'))
        setConfirmOpen(false)
      }
    }
  }

  const onSkip = () => (role === 'recruiter' ? void finish() : exit())
  const onLeave = () => (role === 'recruiter' ? setConfirmOpen(true) : exit())

  const state = lookupFailed
    ? 'unavailable'
    : callState({ token: tokenQuery.isError ? 'error' : tokenQuery.data ? 'ok' : 'loading', connection })
  const otherName = role === 'candidate' ? application?.hiringPost?.recruiter?.name : application?.applicant?.name
  const busy = complete.isPending

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <h1 className="truncate font-display text-lg font-medium">{application?.hiringPost?.title ?? 'Interview'}</h1>
        {otherName ? <p className="truncate text-sm text-muted">with {otherName}</p> : null}
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col p-3 sm:p-4" aria-label="Video call">
        {state === 'unavailable' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
            <p role="alert" className="text-base">The call could not start.</p>
            {(upcoming.error ?? detail.error ?? tokenQuery.error) ? (
              <p className="text-sm text-muted">
                {getErrorMessage(upcoming.error ?? detail.error ?? tokenQuery.error)}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {/* Overlay the preparing pill so mounting/removing it never shifts the video tiles below. */}
            {state === 'preparing' ? (
              <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
                <p role="status" className="flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-sm text-muted shadow-sm">
                  <Spinner decorative className="h-4 w-4" /> Getting the call ready
                </p>
              </div>
            ) : null}
            {tokenQuery.data ? (
              <CallStage url={tokenQuery.data.url} token={tokenQuery.data.token} state={state} onConnection={setConnection} />
            ) : (
              <CallStageSkeleton />
            )}
          </>
        )}
      </main>

      <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
        <Button type="button" variant="secondary" disabled={busy} onClick={onLeave}>Leave</Button>
        <Button type="button" variant="secondary" loading={busy} onClick={onSkip}>Skip</Button>
      </footer>

      {confirmOpen ? <LeaveDialog busy={busy} onNo={() => exit(false)} onYes={() => void finish()} /> : null}
    </div>
  )
}

/** "Mark this interview as done?" with Yes and No. Focus starts on No, and Escape counts as No. */
function LeaveDialog({ busy, onNo, onYes }: { busy: boolean; onNo: () => void; onYes: () => void }) {
  const dialogRef = useDialogFocus(onNo, !busy)

  return (
    <DialogPortal>
      <div className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/55 p-4">
        <section
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="leave-call-title"
          className="motion-panel w-full max-w-sm rounded-lg bg-surface p-5 shadow-overlay"
        >
          <h2 id="leave-call-title" className="font-display text-lg font-medium">Mark this interview as done?</h2>
          <div className="mt-5 flex justify-end gap-2">
            <Button data-no data-dialog-cancel type="button" variant="secondary" disabled={busy} onClick={onNo}>No</Button>
            <Button type="button" loading={busy} onClick={onYes}>Yes</Button>
          </div>
        </section>
      </div>
    </DialogPortal>
  )
}
