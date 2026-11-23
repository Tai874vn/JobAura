'use client'

import { useState } from 'react'
import { Badge, Button, ButtonLink } from '@/shared/ui'
import type { Interview } from '@/shared/schemas'
import type { InterviewRequest } from './api'
import { ConfirmActionDialog } from './confirm-action-dialog'
import { formatPipelineTime } from './format-time'
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

type Dialog = 'other-times' | 'cancel' | 'new-times' | null

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
}: {
  interview: Interview
  viewer: 'recruiter' | 'candidate'
  pending?: boolean
  onAction: (action: InterviewAction) => void
}) {
  const [dialog, setDialog] = useState<Dialog>(null)
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
                <Button size="sm" disabled={pending} onClick={() => onAction({ type: 'pick', startsAt: time })}>
                  Pick this time
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

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
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setDialog('other-times')}>Ask for other times</Button>
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
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={(note) => {
          setDialog(null)
          onAction({ type: 'ask-other-times', note })
        }}
      />
      <ConfirmActionDialog
        open={dialog === 'cancel'}
        title="Cancel this interview?"
        description={candidate ? 'The recruiter will be told.' : 'The candidate will be told.'}
        confirmLabel="Cancel interview"
        noteLabel="Reason"
        tone="danger"
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={(note) => {
          setDialog(null)
          onAction({ type: 'cancel', note })
        }}
      />
      <RequestInterviewDialog
        open={dialog === 'new-times'}
        timesOnly
        pending={pending}
        onClose={() => setDialog(null)}
        onSubmit={(request: InterviewRequest) => {
          setDialog(null)
          onAction({ type: 'send-times', times: request.proposedTimes })
        }}
      />
    </section>
  )
}
