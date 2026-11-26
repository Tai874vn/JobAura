'use client'


import { ArrowLeft, MessageSquare, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useId } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ApplicationDetail } from '@/shared/schemas'
import { Avatar, Button, Skeleton, DialogPortal, useDialogFocus } from '@/shared/ui'
import { pipelineApi, statusLabel, type InterviewRequest } from '../../api'
import { applicantActions, dialogStillAllowed, noOpeningsLeft, openingsLeft, outcomeWanted, type ApplicantDialog } from '../../utils/applicant-actions'
import { formatApplicantDay, formatYears, resumeJobLines } from '../../utils/applicant-format'
import { ApplicationTimeline } from '../application-timeline'
import { ConfirmActionDialog } from '../confirm-action-dialog'
import { InterviewCard, type InterviewAction } from '../interview-card'
import { RequestInterviewDialog } from './request-interview-dialog'
import { bookedToastText } from '../../utils/format-time'
import { runDialogAction } from '../../utils/run-dialog-action'
import { StatusBadge } from '../status-badge'
import { usePipelineMutation } from '../../hooks/use-pipeline-mutation'

/** One thing the recruiter can ask the server to do on this application. */
type PanelAction =
  | { type: 'shortlist' }
  | { type: 'reject'; note?: string }
  | { type: 'offer'; note?: string }
  | { type: 'withdraw-offer' }
  | { type: 'request'; request: InterviewRequest }
  | { type: 'interview'; interviewId: number; action: InterviewAction }

type Dialog = ApplicantDialog | null

/** Shortlist and Mark as done have no dialog, so a refused step is told by a toast; every other step is told inside its dialog. */
const toastsErrors = (act: PanelAction) => act.type === 'shortlist' || (act.type === 'interview' && act.action.type === 'complete')

const doneText: Record<PanelAction['type'], string> = {
  shortlist: 'Shortlisted. The candidate is told.',
  reject: 'The candidate is told.',
  offer: 'Offer sent.',
  'withdraw-offer': 'Offer withdrawn. One opening is free.',
  request: 'Interview requested. The candidate is told.',
  interview: 'Saved.',
}

function runAction(id: number, act: PanelAction): Promise<ApplicationDetail> {
  switch (act.type) {
    case 'shortlist':
      return pipelineApi.shortlist(id)
    case 'reject':
      return pipelineApi.reject(id, act.note)
    case 'offer':
      return pipelineApi.offer(id, act.note)
    case 'withdraw-offer':
      return pipelineApi.withdrawOffer(id)
    case 'request':
      return pipelineApi.requestInterview(id, act.request)
    case 'interview': {
      const { interviewId, action } = act
      switch (action.type) {
        case 'send-times':
          return pipelineApi.proposeTimes(interviewId, action.times)
        case 'ask-other-times':
          return pipelineApi.askOtherTimes(interviewId, action.note)
        case 'cancel':
          return pipelineApi.cancelInterview(interviewId, action.note)
        case 'complete':
          return pipelineApi.completeInterview(interviewId)
        case 'pick':
          return pipelineApi.pickTime(interviewId, action.startsAt)
      }
    }
  }
}

const isActive = (status: string) => status === 'PROPOSED' || status === 'RESCHEDULE_REQUESTED' || status === 'SCHEDULED'

/** Active interviews first, then the newest round first. */
export function sortedInterviews(interviews: ApplicationDetail['interviews']) {
  return [...interviews].sort((a, b) => Number(isActive(b.status)) - Number(isActive(a.status)) || b.round - a.round)
}

function Fact({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 min-w-0 p-3' : 'min-w-0 p-3'}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
    </div>
  )
}

/**
 * The selected applicant, in full: header, action buttons, resume summary, cover letter, interviews and history.
 * The server decides every step, so after a refused step (409) the application is read again and the buttons follow.
 * Mount it with `key={application.id}`, so dialogs and notes never carry over to another person.
 */
export function ApplicantPanel({
  application,
  backHref,
  outcomeOnLoad = false,
  onOutcomeShown,
}: {
  application: ApplicationDetail
  /** The list without a selected applicant; the Back link on phones. */
  backHref: string
  /** The page was opened with ?outcome=1 (the recruiter left the call and marked the interview done). */
  outcomeOnLoad?: boolean
  onOutcomeShown?: () => void
}) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const mutation = usePipelineMutation(application.id, (act: PanelAction) => runAction(application.id, act), {
    quietErrors: (act) => !toastsErrors(act),
  })
  const pending = mutation.isPending

  const applicant = application.applicant
  const name = applicant?.name ?? 'Applicant'
  const firstName = name.split(' ')[0]
  const post = application.hiringPost
  const actions = applicantActions(application)
  const noRoom = noOpeningsLeft(application)
  const left = openingsLeft(post)
  const resume = application.resume
  const active = application.interviews.some((i) => isActive(i.status))
  const [outcomeOpen, setOutcomeOpen] = useState(outcomeOnLoad && outcomeWanted(application))
  // A sentence kept on the panel when a dialog had to close because the application moved on.
  const [notice, setNotice] = useState<string | null>(null)

  // ?outcome=1 has been used once; the page takes it out of the address.
  useEffect(() => {
    if (outcomeOnLoad) onOutcomeShown?.()
  }, [outcomeOnLoad, onOutcomeShown])

  // The server refused a step because the application changed (for example the candidate withdrew). Once the
  // fresh application no longer allows what the dialog does, close it, so no stale button stays live.
  const stale = dialog !== null && !dialogStillAllowed(dialog, application)
  // (React allows setting this component's own state while it renders; it redraws at once with the dialog closed.)
  if (stale) {
    setNotice(dialogError ?? 'This application changed, so that step is no longer possible.')
    setDialog(null)
    setDialogError(null)
  }

  /** Runs an action; a thrown error means the server said no, and the caller shows its sentence. */
  async function perform(act: PanelAction) {
    setNotice(null)
    await mutation.mutateAsync(act)
    if (act.type === 'interview' && act.action.type === 'complete') setOutcomeOpen(true)
    else if (act.type === 'interview' && act.action.type === 'pick') toast.success(bookedToastText(act.action.startsAt), { duration: 4000 })
    else toast.success(doneText[act.type])
  }
  function closeDialog() {
    setDialog(null)
    setDialogError(null)
  }
  async function fromDialog(act: PanelAction) {
    setDialogError(null)
    const result = await runDialogAction(() => perform(act), (error) => getErrorMessage(error, 'Could not save this change. Please try again.'))
    if ('error' in result) setDialogError(result.error)
    else closeDialog()
  }
  function choose(choice: OutcomeChoice) {
    setOutcomeOpen(false)
    if (choice === 'offer') setDialog('offer')
    else if (choice === 'round') setDialog('request')
    else if (choice === 'reject') setDialog('reject')
  }
  function openChat() {
    if (applicant) window.dispatchEvent(new CustomEvent('jobaura:open-chat', { detail: { userId: applicant.id } }))
  }

  const lastEvent = application.events[application.events.length - 1]
  const buttons = actions.filter((action) => action !== 'message')
  const primary = buttons[0]

  return (
    <article className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface max-lg:h-full max-lg:rounded-none max-lg:border-0" aria-labelledby={`applicant-${application.id}`}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <Link href={backHref} scroll={false} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary lg:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All applicants
        </Link>

        <div className="lg:results-in">
        <div className="flex flex-wrap items-center gap-3">
          {applicant ? (
            <Link href={`/profile/${applicant.id}`} aria-label={`View ${name}'s profile`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:ring-offset-2">
              <Avatar name={name} src={applicant.avatar} size="lg" />
            </Link>
          ) : (
            <Avatar name={name} size="lg" />
          )}
          <div className="min-w-0 flex-1 basis-40">
            <h2 id={`applicant-${application.id}`} className="truncate font-display text-xl font-medium leading-tight">{name}</h2>
            <p className="truncate text-sm text-muted">
              {[application.createdAt ? `Applied ${formatApplicantDay(application.createdAt)}` : null, applicant?.location].filter(Boolean).join(' · ')}
              {applicant ? (
                <>
                  {application.createdAt || applicant.location ? ' · ' : ''}
                  <Link href={`/profile/${applicant.id}`} className="font-medium text-foreground hover:text-primary hover:underline">View profile</Link>
                </>
              ) : null}
            </p>
          </div>
          <StatusBadge status={application.status} viewer="recruiter" reason={application.statusReason} />
          <Button type="button" variant="secondary" size="sm" onClick={openChat} disabled={!applicant}>
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Message
          </Button>
        </div>

        {application.status === 'REJECTED' && application.statusNote ? (
          <p className="mt-4 break-words rounded-lg bg-surface-muted p-3 text-sm">Your note: {application.statusNote}</p>
        ) : null}
        {application.status === 'OFFERED' && application.offerNote ? (
          <p className="mt-4 break-words rounded-lg bg-surface-muted p-3 text-sm">Offer: {application.offerNote}</p>
        ) : null}

        {notice ? <p role="alert" className="mt-4 break-words rounded-lg bg-danger/10 p-3 text-sm text-danger">{notice}</p> : null}

        <h3 className="mt-6 font-display text-base font-medium">Resume</h3>
        {resume ? (
          <>
            <dl className="mt-2 grid grid-cols-2 divide-border overflow-hidden rounded-lg border border-border sm:grid-cols-3 [&>div]:border-b [&>div]:border-border">
              <Fact label="Occupation">{resume.occupationTitle || resume.occupation || 'Not given'}</Fact>
              <Fact label="Years">{formatYears(resume.years)}</Fact>
              <Fact label="Related years">{resume.relatedYears ? formatYears(resume.relatedYears) : 'None'}</Fact>
              <Fact label="AI level">{resume.level || 'Not decided yet'}</Fact>
              <Fact label="Degree" wide>{resume.degree || 'Not given'}</Fact>
            </dl>
            <h3 className="mt-6 font-display text-base font-medium">Recent jobs</h3>
            {resume.jobs.length ? (
              <ul className="mt-2 grid gap-2 text-sm">
                {resumeJobLines(resume.jobs).map((job, index) => (
                  <li key={index} className="flex flex-wrap justify-between gap-x-3">
                    <span className="min-w-0 break-words font-medium">{job.title}</span>
                    {job.period ? <span className="text-muted">{job.period}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No jobs listed.</p>
            )}
            <h3 className="mt-6 font-display text-base font-medium">Skills</h3>
            {resume.skills.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {resume.skills.map((skill) => (
                  <li key={skill} className="rounded-md border border-border bg-background px-2.5 py-0.5 text-sm">{skill}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No skills listed.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">{firstName} has no saved resume.</p>
        )}

        <h3 className="mt-6 font-display text-base font-medium">Cover letter</h3>
        {application.coverLetter?.trim() ? (
          <p className="mt-2 whitespace-pre-line break-words rounded-lg bg-background p-3 text-sm leading-6">{application.coverLetter}</p>
        ) : (
          <p className="mt-2 text-sm text-muted">No cover letter.</p>
        )}

        {application.interviews.length ? (
          <>
            <h3 className="mt-6 font-display text-base font-medium">Interviews</h3>
            <div className="mt-2 grid gap-3">
              {sortedInterviews(application.interviews).map((interview) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  viewer="recruiter"
                  pending={pending}
                  onStale={setNotice}
                  onAction={(action) => {
                    const run = perform({ type: 'interview', interviewId: interview.id, action })
                    // Mark as done has no dialog to show an error in; the toast already told the recruiter.
                    return action.type === 'complete' ? run.catch(() => undefined) : run
                  }}
                />
              ))}
            </div>
          </>
        ) : null}

        <h3 className="mt-6 font-display text-base font-medium">Timeline</h3>
        <div className="mt-2">
          <ApplicationTimeline events={application.events} />
        </div>
        </div>
      </div>

      <div className="border-t border-border bg-surface py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pl-4 pr-28 sm:pl-6 sm:pr-28 lg:pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {application.status === 'INTERVIEWING' && active ? <p className="min-w-40 flex-1 text-sm text-muted">You can send an offer after the interview.</p> : null}
          {application.status === 'OFFERED' ? <p className="min-w-40 flex-1 text-sm text-muted">Waiting for {firstName} to answer.</p> : null}
          {!buttons.length ? (
            <p className="text-sm text-muted">
              {statusLabel(application.status, 'recruiter', application.statusReason)}
              {lastEvent ? ` on ${formatApplicantDay(lastEvent.createdAt)}` : ''}.{application.status === 'HIRED' ? ' Nothing more to do here.' : ''}
            </p>
          ) : null}
          {noRoom ? <p className="min-w-40 flex-1 text-sm text-muted">No openings left · withdraw an offer to send another</p> : null}
          {buttons.map((action) => {
            const lead = action === primary && !noRoom
            switch (action) {
              case 'shortlist':
                return <Button key={action} disabled={pending} onClick={() => void perform({ type: 'shortlist' }).catch(() => undefined)}>Shortlist</Button>
              case 'requestInterview':
                return <Button key={action} variant={lead ? 'primary' : 'secondary'} disabled={pending} onClick={() => setDialog('request')}>Request interview</Button>
              case 'offer':
                return <Button key={action} disabled={pending} onClick={() => setDialog('offer')}>Send offer</Button>
              case 'nextRound':
                return <Button key={action} variant="secondary" disabled={pending} onClick={() => setDialog('request')}>Another round</Button>
              case 'withdrawOffer':
                return <Button key={action} variant="secondary" disabled={pending} onClick={() => setDialog('withdraw-offer')}>Withdraw offer</Button>
              case 'reject':
                return <Button key={action} variant="danger" className="ml-auto" disabled={pending} onClick={() => setDialog('reject')}>Reject</Button>
              default:
                return null
            }
          })}
        </div>
      </div>

      <ConfirmActionDialog
        open={dialog === 'reject'}
        title={`Reject ${name}?`}
        description={`${firstName} sees "Not selected".`}
        confirmLabel="Reject"
        noteLabel="Note to the candidate"
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={(note) => void fromDialog({ type: 'reject', note })}
      />
      <ConfirmActionDialog
        open={dialog === 'offer'}
        title={`Send an offer to ${name}?`}
        description={`${left === null ? 'This post hires without a limit.' : `${Math.max(left, 0)} of ${post?.openings ?? 0} openings left.`} ${firstName} can accept or decline.`}
        confirmLabel="Send offer"
        noteLabel="Offer note: start date, pay, anything else"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={(note) => void fromDialog({ type: 'offer', note })}
      />
      <ConfirmActionDialog
        open={dialog === 'withdraw-offer'}
        title="Withdraw this offer?"
        description={`${name} goes back to Interview and is told.`}
        confirmLabel="Withdraw offer"
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => void fromDialog({ type: 'withdraw-offer' })}
      />
      <RequestInterviewDialog
        open={dialog === 'request'}
        pending={pending}
        serverError={dialogError}
        onClose={closeDialog}
        onSubmit={(request) => void fromDialog({ type: 'request', request })}
      />
      <InterviewOutcomeDialog open={outcomeOpen} name={name} noOpeningsLeft={noRoom} onChoose={choose} />
    </article>
  )
}

/**
 * Shown while the full application loads: the header from the list row, and nothing to act on yet.
 * The list row has no interviews or history for sure, so no buttons or resume text are drawn from it.
 */
export function ApplicantPanelLoading({ row, backHref }: { row?: ApplicationDetail; backHref: string }) {
  const name = row?.applicant?.name ?? 'Applicant'
  return (
    <article className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface max-lg:h-full max-lg:rounded-none max-lg:border-0" aria-busy="true" aria-label={`${name}, loading`}>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Link href={backHref} scroll={false} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary lg:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All applicants
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {row ? (
            <Avatar name={name} src={row.applicant?.avatar} size="lg" />
          ) : (
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          )}
          <div className="min-w-0 flex-1 basis-40">
            {row ? (
              <h2 className="truncate font-display text-xl font-medium leading-tight">{name}</h2>
            ) : (
              <Skeleton className="h-6 w-44" />
            )}
            <Skeleton className="mt-1.5 h-3.5 w-52 max-w-full" />
          </div>
          {row ? <StatusBadge status={row.status} viewer="recruiter" reason={row.statusReason} /> : <Skeleton className="h-6 w-20 rounded-full" />}
        </div>
        <Skeleton className="mt-6 h-5 w-20" />
        <Skeleton className="mt-2 h-28 w-full rounded-lg" />
        <Skeleton className="mt-6 h-5 w-28" />
        <Skeleton className="mt-2 h-20 w-full rounded-lg" />
      </div>
      {/* Non-interactive footer skeleton reserves the sticky action bar height without live buttons. */}
      <div className="border-t border-border bg-surface py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pl-4 pr-28 sm:pl-6 sm:pr-28 lg:pb-3" aria-hidden="true">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="ml-auto h-10 w-24 rounded-lg" />
        </div>
      </div>
    </article>
  )
}

export type OutcomeChoice = 'offer' | 'round' | 'reject' | 'later'

/**
 * Shown after an interview is done (Mark as done, or leaving the call with Yes): "How did it go?".
 * Each choice only picks the next step; the panel opens the matching dialog. "Decide later" just closes.
 */
export function InterviewOutcomeDialog({
  open,
  name,
  noOpeningsLeft,
  onChoose,
}: {
  open: boolean
  name: string
  /** True when every opening is taken: the offer button is off and says why. */
  noOpeningsLeft: boolean
  onChoose: (choice: OutcomeChoice) => void
}) {
  if (!open) return null
  return <OutcomeBody name={name} noOpeningsLeft={noOpeningsLeft} onChoose={onChoose} />
}

function OutcomeBody({ name, noOpeningsLeft, onChoose }: { name: string; noOpeningsLeft: boolean; onChoose: (choice: OutcomeChoice) => void }) {
  const titleId = useId()

  const dialogRef = useDialogFocus(() => onChoose('later'))

  return (
    <DialogPortal>
    <div
      className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onChoose('later')
      }}
    >
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
        <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={() => onChoose('later')} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <h2 id={titleId} className="pr-10 font-display text-lg font-medium">How did it go?</h2>
        <p className="mt-1 text-sm leading-6 text-muted">The interview with {name} is marked as done.</p>
        <div className="mt-5 grid gap-2">
          <Button type="button" disabled={noOpeningsLeft} onClick={() => onChoose('offer')}>Send offer</Button>
          {noOpeningsLeft ? <p className="text-sm text-muted">No openings left · withdraw an offer to send another</p> : null}
          <Button type="button" variant="secondary" onClick={() => onChoose('round')}>Another round</Button>
          <Button type="button" variant="danger" onClick={() => onChoose('reject')}>Reject</Button>
          <Button data-dialog-cancel type="button" variant="ghost" onClick={() => onChoose('later')}>Decide later</Button>
        </div>
      </section>
    </div>
    </DialogPortal>
  )
}
