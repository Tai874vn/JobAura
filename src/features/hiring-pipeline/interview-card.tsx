'use client'

import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/lib/utils'
import { Badge, Button, ButtonLink } from '@/shared/ui'
import type { Interview } from '@/shared/schemas'
import type { InterviewRequest } from './api'
import { ConfirmActionDialog } from './confirm-action-dialog'
import { formatPipelineTime } from './format-time'
import { runDialogAction } from './run-dialog-action'
import { RequestInterviewDialog } from './request-interview-dialog'

/** What a button on the card asks the parent to do. The parent calls the matching `pipelineApi` function. */
export type InterviewAction =
  | { type: 'pick'; startsAt: string }
  | { type: 'ask-other-times'; note?: string }
  | { type: 'send-times'; times: string[] }
  | { type: 'cancel'; note?: string }
  | { type: 'complete' }

const statusWords: Record<Interview['status'], string> = {
  PROPOSED: 'Waiting for a time',
  RESCHEDULE_REQUESTED: 'Other times asked for',
  SCHEDULED: 'Booked',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
}

const modeWords: Record<Interview['mode'], string> = { ONLINE: 'Online', ONSITE: 'Onsite', PHONE: 'Phone' }

/** True when a proposed time is already behind us (read at render, so a page left open shows it). */
function hasPassed(iso: string) {
  return new Date(iso).getTime() <= Date.now()
}

/** The refusal shown under the proposed times. */
export function PickErrorLine({ message }: { message: string | null }) {
  return message ? <p role="alert" className="mt-2 break-words text-sm text-danger">{message}</p> : null
}

type Dialog = 'other-times' | 'cancel' | 'new-times' | null

/**
 * True while the interview still allows what an open dialog does. After a refused step (409) the interview is
 * read again; if it moved on (cancelled, booked, done), the dialog must close so no stale button stays live.
 */
export function interviewDialogAllowed(dialog: Exclude<Dialog, null>, status: Interview['status']): boolean {
  if (dialog === 'cancel') return status === 'PROPOSED' || status === 'RESCHEDULE_REQUESTED' || status === 'SCHEDULED'
  if (dialog === 'other-times') return status === 'PROPOSED'
  return status === 'PROPOSED' || status === 'RESCHEDULE_REQUESTED'
}

/**
 * One interview round. The candidate picks a time from the proposed ones; the recruiter sends times, cancels,
 * or skips (marks an online interview as done without holding the call). `pending` locks the buttons while a
 * request is running.
 */
export function InterviewCard({
  interview,
  viewer,
  pending = false,
  onAction,
  onStale,
}: {
  interview: Interview
  viewer: 'recruiter' | 'candidate'
  pending?: boolean
  /** May return a promise: a dialog stays open until it settles, and shows the error if it fails. */
  onAction: (action: InterviewAction) => void | Promise<unknown>
  /** Called with the server's sentence when a dialog closed by itself because the interview moved on. */
  onStale?: (message: string) => void
}) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  // The server's sentence when a picked time was refused (for example the slot is now in the past).
  const [pickError, setPickError] = useState<string | null>(null)
  const stale = dialog !== null && !interviewDialogAllowed(dialog, interview.status)
  useEffect(() => {
    if (!stale) return
    onStale?.(dialogError ?? 'This interview changed, so that step is no longer possible.')
    // Closing is the point of this effect (the interview came back from the server changed).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDialog(null)
    setDialogError(null)
  }, [stale, dialogError, onStale])
  const closeDialog = () => {
    setDialog(null)
    setDialogError(null)
  }
  async function pickTime(startsAt: string) {
    setPickError(null)
    const result = await runDialogAction(() => onAction({ type: 'pick', startsAt }), (error) => getErrorMessage(error, 'Could not book this time. Please try again.'))
    if ('error' in result) setPickError(result.error)
  }
  async function runFromDialog(action: InterviewAction) {
    setBusy(true)
    setDialogError(null)
    const result = await runDialogAction(() => onAction(action), (error) => getErrorMessage(error, 'Could not save this change. Please try again.'))
    setBusy(false)
    if ('error' in result) setDialogError(result.error)
    else closeDialog()
  }
  const candidate = viewer === 'candidate'
  const online = interview.mode === 'ONLINE'
  const place = online ? 'Online on JobAura' : interview.location || (interview.mode === 'PHONE' ? 'By phone' : '')
  const active = interview.status === 'PROPOSED' || interview.status === 'RESCHEDULE_REQUESTED' || interview.status === 'SCHEDULED'

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Interview {interview.round}</h3>
        <Badge tone={interview.status === 'SCHEDULED' ? 'primary' : interview.status === 'CANCELLED' ? 'danger' : 'neutral'}>
          {statusWords[interview.status]}
        </Badge>
      </div>

      <p className="mt-2 break-words text-sm text-muted">
        {modeWords[interview.mode]} · {interview.durationMinutes} min{place ? ` · ${place}` : ''}
      </p>

      {interview.status === 'SCHEDULED' && interview.scheduledAt ? (
        <p className="mt-2 text-sm font-medium">{formatPipelineTime(interview.scheduledAt)}</p>
      ) : null}

      {interview.status === 'PROPOSED' ? (
        <ul className="mt-3 space-y-2">
          {interview.proposedTimes.map((time) => (
            <li key={time} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">{formatPipelineTime(time)}</span>
              {candidate ? (
                hasPassed(time) ? (
                  <Button size="sm" disabled>Passed</Button>
                ) : (
                  <Button size="sm" disabled={pending} onClick={() => void pickTime(time)}>
                    Pick this time
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {interview.status === 'PROPOSED' ? <PickErrorLine message={pickError} /> : null}

      {interview.status === 'RESCHEDULE_REQUESTED' && interview.rescheduleNote ? (
        <p className="mt-2 break-words text-sm text-muted">&ldquo;{interview.rescheduleNote}&rdquo;</p>
      ) : null}

      {interview.note ? <p className="mt-2 break-words text-sm">{interview.note}</p> : null}

      {active ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {interview.status === 'SCHEDULED' && online ? (
            <ButtonLink href={`/interviews/${interview.id}/call`} size="sm">
              Join call
            </ButtonLink>
          ) : null}
          {!candidate && interview.status === 'SCHEDULED' && online ? (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => onAction({ type: 'complete' })}>Skip</Button>
          ) : null}
          {!candidate && interview.status === 'SCHEDULED' && !online ? (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => onAction({ type: 'complete' })}>Mark as done</Button>
          ) : null}
          {candidate && interview.status === 'PROPOSED' ? (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setDialog('other-times')}>None of these work</Button>
          ) : null}
          {!candidate && interview.status !== 'SCHEDULED' ? (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setDialog('new-times')}>Send new times</Button>
          ) : null}
          <Button size="sm" variant="danger" disabled={pending} onClick={() => setDialog('cancel')}>Cancel interview</Button>
        </div>
      ) : null}

      <ConfirmActionDialog
        open={dialog === 'other-times'}
        title="Ask for other times"
        description="The recruiter will be asked to send new times."
        confirmLabel="Ask for other times"
        noteLabel="What works better for you"
        pending={pending || busy}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={(note) => void runFromDialog({ type: 'ask-other-times', note })}
      />
      <ConfirmActionDialog
        open={dialog === 'cancel'}
        title="Cancel this interview?"
        description={candidate ? 'The recruiter will be told.' : 'The candidate will be told.'}
        confirmLabel="Cancel interview"
        noteLabel="Reason"
        tone="danger"
        pending={pending || busy}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={(note) => void runFromDialog({ type: 'cancel', note })}
      />
      <RequestInterviewDialog
        open={dialog === 'new-times'}
        timesOnly
        pending={pending || busy}
        serverError={dialogError}
        onClose={closeDialog}
        onSubmit={(request: InterviewRequest) => void runFromDialog({ type: 'send-times', times: request.proposedTimes })}
      />
    </section>
  )
}
