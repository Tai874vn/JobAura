'use client'

/**
 * Full-screen video call page for an online job interview.
 * Loads the application and call token, polls to detect when the interview ends, renders the video stage, and handles leaving or marking the interview done.
 *
 * Calls: GET /api/interviews/upcoming; GET /api/applications/:id; POST /api/interviews/:id/call-token; POST /api/interviews/:id/complete; useSession; useDialogFocus; CallStage; CallLoading; callState
 * Used by:
 *   - app/interviews/[id]/call/page.tsx
 */

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
import { CallLoading, CallStageSkeleton } from './call-loading'
import { callState } from '../../utils/call-state'
import type { CallConnection } from './call-stage'

// The video part is loaded in the browser only (LiveKit needs the camera, the microphone and WebRTC).
const CallStage = dynamic(() => import('./call-stage'), { ssr: false, loading: CallStageSkeleton })

const positive = (value: string | null) => (value && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null)

function isMissing(error: unknown) {
  return error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 403)
}

/** True when the interview is done or cancelled, so the call is over. */
function isOver(status: string | undefined) {
  return status === 'COMPLETED' || status === 'CANCELLED'
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
 * interviews when the link has none), fetches the call pass, and joins the room. Leave is always on the
 * page, also when the pass or the connection fails, so nobody is stuck here. When the interview ends (the recruiter
 * marked it done, or it was cancelled), the call closes on its own: camera, microphone and sound stop.
 */
export function CallScreen({ interviewId }: { interviewId: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSession()
  const userId = user?.id ?? 0
  const applicationParam = positive(searchParams.get('application'))

  // Without ?application= the upcoming list tells which application this interview belongs to.
  // Data: pipelineApi.upcoming → GET /api/interviews/upcoming → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts upcoming()
  const upcoming = useQuery({
    queryKey: pipelineKeys.upcoming(user?.id),
    queryFn: pipelineApi.upcoming,
    enabled: Boolean(user) && applicationParam === null,
    staleTime: 15_000,
  })
  const applicationId = applicationParam ?? upcoming.data?.find((row) => row.id === interviewId)?.applicationId ?? null

  // Data: pipelineApi.detail → GET /api/applications/:id → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts findOne()
  const detail = useQuery({
    queryKey: pipelineKeys.detail(applicationId ?? 0, user?.id),
    queryFn: () => pipelineApi.detail(applicationId as number),
    enabled: Boolean(user) && applicationId !== null,
    staleTime: 15_000,
    // While the call is open, look every 5 seconds whether the other side ended the interview.
    refetchInterval: (query) =>
      isOver(query.state.data?.interviews.find((item) => item.id === interviewId)?.status) ? false : 5_000,
  })

  // The pass is used once, so it is never kept for another visit or another person. The key avoids the
  // 'pipeline' prefix so list refreshes do not ask for a new pass in the middle of a call.
  // Data: pipelineApi.callToken → POST /api/interviews/:id/call-token → NestjsBE/src/modules/hiring-pipeline/services/video-call.service.ts callToken()
  const tokenQuery = useQuery({
    queryKey: ['call-token', interviewId, userId],
    queryFn: () => pipelineApi.callToken(interviewId),
    enabled: Boolean(user) && Boolean(detail.data) && !isOver(detail.data?.interviews.find((item) => item.id === interviewId)?.status),
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
  // Data: pipelineApi.completeInterview → POST /api/interviews/:id/complete → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts complete()
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
  // Only a real "not found" or "not yours" answer says so. Any other failure keeps Leave on the page.
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

  const onLeave = () => (role === 'recruiter' ? setConfirmOpen(true) : exit())

  // An ended interview removes the video part, which leaves the room and stops camera, microphone and sound.
  const ended = isOver(interview?.status)
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
        {ended ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
            <p role="status" className="text-base">This interview has ended.</p>
            <p className="text-sm text-muted">You can leave the call.</p>
          </div>
        ) : state === 'unavailable' ? (
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
        <Button type="button" variant="secondary" loading={busy} onClick={ended ? () => exit(role === 'recruiter') : onLeave}>Leave</Button>
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

/**
 * Where the person goes when they leave the call page.
 * - candidate: always My applications, with the application open
 * - recruiter: the post's applicants, with the outcome dialog open when `outcome` is true
 */
export function callExitHref(input: {
  role: 'recruiter' | 'candidate'
  postId: number
  applicationId: number
  outcome?: boolean
}): string {
  if (input.role === 'candidate') return `/my-applications?application=${input.applicationId}`
  const base = `/my-hiring-posts/${input.postId}/applicants?application=${input.applicationId}`
  return input.outcome ? `${base}&outcome=1` : base
}

/** True when "complete" was refused (409) only because the interview is already done, so leaving is still right. */
export function isAlreadyCompleted(error: unknown): boolean {
  if (!(error instanceof AxiosError) || error.response?.status !== 409) return false
  const message = (error.response.data as { message?: unknown } | undefined)?.message
  return typeof message === 'string' && /already completed/i.test(message)
}

/** Where to go when the application could not be read (so the post id is unknown). */
export function fallbackExitHref(role: 'recruiter' | 'candidate'): string {
  return role === 'candidate' ? '/my-applications' : '/my-hiring-posts'
}
