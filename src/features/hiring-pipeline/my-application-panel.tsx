'use client'

import { ArrowLeft, ExternalLink, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatHiringPostSalary } from '@/features/hiring/hiring-post-card'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ApplicationDetail } from '@/shared/schemas'
import { Avatar, Button, Skeleton } from '@/shared/ui'
import { pipelineApi } from './api'
import { sortedInterviews } from './applicant-panel'
import { formatApplicantDay } from './applicant-format'
import { ApplicationTimeline } from './application-timeline'
import { ApplicationTracker } from './application-tracker'
import { candidateDialogAllowed, type CandidateDialog } from './candidate-progress'
import { ConfirmActionDialog } from './confirm-action-dialog'
import { InterviewCard, type InterviewAction } from './interview-card'
import { OfferCard } from './offer-card'
import { bookedToastText } from './format-time'
import { runDialogAction } from './run-dialog-action'
import { StatusBadge } from './status-badge'
import { usePipelineMutation } from './use-pipeline-mutation'

/** One thing the candidate can ask the server to do on this application. */
type PanelAction =
  | { type: 'withdraw' }
  | { type: 'accept' }
  | { type: 'decline'; note?: string }
  | { type: 'interview'; interviewId: number; action: InterviewAction }

const doneText: Record<PanelAction['type'], string> = {
  withdraw: 'Application withdrawn.',
  accept: 'You are hired. The recruiter is told.',
  decline: 'Offer declined. The recruiter is told.',
  interview: 'Saved.',
}

function runAction(id: number, act: PanelAction): Promise<ApplicationDetail> {
  switch (act.type) {
    case 'withdraw':
      return pipelineApi.withdraw(id)
    case 'accept':
      return pipelineApi.acceptOffer(id)
    case 'decline':
      return pipelineApi.declineOffer(id, act.note)
    case 'interview': {
      const { interviewId, action } = act
      switch (action.type) {
        case 'pick':
          return pipelineApi.pickTime(interviewId, action.startsAt)
        case 'ask-other-times':
          return pipelineApi.askOtherTimes(interviewId, action.note)
        case 'cancel':
          return pipelineApi.cancelInterview(interviewId, action.note)
        default:
          // Sending times and marking done belong to the recruiter; the candidate's card never shows them.
          return Promise.reject(new Error('This step is for the recruiter.'))
      }
    }
  }
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
    </div>
  )
}

/**
 * One application, in full, for the candidate: header, tracker, offer, interviews, the role and the history.
 * The server decides every step, so after a refused step (409) the application is read again and the buttons follow.
 * Mount it with `key={application.id}`, so dialogs never carry over to another application.
 */
export function MyApplicationPanel({ application, backHref }: { application: ApplicationDetail; backHref: string }) {
  const [dialog, setDialog] = useState<CandidateDialog | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  // A sentence kept on the panel when a dialog had to close because the application moved on.
  const [notice, setNotice] = useState<string | null>(null)
  const mutation = usePipelineMutation(application.id, (act: PanelAction) => runAction(application.id, act), {
    // Every refusal is told on the screen itself (a dialog, or under the times on the interview card), never by a toast.
    quietErrors: () => true,
  })
  const pending = mutation.isPending

  const post = application.hiringPost
  const company = post?.companyName || post?.recruiter?.name || 'the company'
  const recruiter = post?.recruiter
  const recruiterId = recruiter?.id ?? post?.recruiterId
  const firstName = recruiter?.name.split(' ')[0] ?? 'the recruiter'
  const salary = post ? formatHiringPostSalary(post) : ''
  const canWithdraw = candidateDialogAllowed('withdraw', application.status)

  // The server refused a step because the application changed (for example the offer was withdrawn). Once the
  // fresh application no longer allows what the dialog does, close it, so no stale button stays live.
  const stale = dialog !== null && !candidateDialogAllowed(dialog, application.status)
  // (React allows setting this component's own state while it renders; it redraws at once with the dialog closed.)
  if (stale) {
    setNotice(dialogError ?? 'This application changed, so that step is no longer possible.')
    setDialog(null)
    setDialogError(null)
  }

  async function perform(act: PanelAction) {
    setNotice(null)
    await mutation.mutateAsync(act)
    if (act.type === 'interview' && act.action.type === 'pick') toast.success(bookedToastText(act.action.startsAt), { duration: 4000 })
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
  function openChat() {
    if (recruiterId) window.dispatchEvent(new CustomEvent('jobaura:open-chat', { detail: { userId: recruiterId } }))
  }

  return (
    <article className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface max-lg:h-full max-lg:rounded-none max-lg:border-0" aria-labelledby={`application-${application.id}`}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <Link href={backHref} scroll={false} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary lg:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All applications
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={company} src={recruiter?.avatar} size="lg" />
          <div className="min-w-0 flex-1 basis-40">
            <p className="truncate font-medium">{company}</p>
            <p className="truncate text-sm text-muted">
              {recruiter ? `Recruiter ${recruiter.name} · ` : ''}applied {formatApplicantDay(application.createdAt)}
            </p>
          </div>
          <StatusBadge status={application.status} viewer="candidate" reason={application.statusReason} />
        </div>

        <h2 id={`application-${application.id}`} className="mt-4 break-words font-display text-xl font-medium leading-tight">
          {post?.title ?? 'Hiring post'}
        </h2>
        {post?.location ? <p className="mt-0.5 text-sm text-muted">{post.location}</p> : null}

        {notice ? <p role="alert" className="mt-4 break-words rounded-lg bg-danger/10 p-3 text-sm text-danger">{notice}</p> : null}

        <div className="mt-5">
          <ApplicationTracker application={application} />
        </div>

        {application.status === 'OFFERED' ? (
          <div className="mt-5">
            <OfferCard application={application} company={company} pending={pending} onAccept={() => setDialog('accept')} onDecline={() => setDialog('decline')} />
          </div>
        ) : null}

        {application.interviews.length ? (
          <>
            <h3 className="mt-6 font-display text-base font-medium">Interviews</h3>
            <div className="mt-2 grid gap-3">
              {sortedInterviews(application.interviews).map((interview) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  viewer="candidate"
                  pending={pending}
                  onStale={setNotice}
                  // The card shows the server's sentence if the step is refused.
                  onAction={(action) => perform({ type: 'interview', interviewId: interview.id, action })}
                />
              ))}
            </div>
          </>
        ) : null}

        {post ? (
          <>
            <h3 className="mt-6 font-display text-base font-medium">The role</h3>
            <dl className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-border sm:grid-cols-3 [&>div]:border-b [&>div]:border-border">
              <Fact label="Salary">{salary || 'Not given'}</Fact>
              <Fact label="Type">{post.employmentType || 'Not given'}</Fact>
              <Fact label="Location">{post.location || 'Not given'}</Fact>
            </dl>
            {post.description?.trim() ? <p className="mt-3 line-clamp-6 whitespace-pre-line break-words text-sm leading-6">{post.description}</p> : null}
            {/* The server refuses a closed post to candidates, so the link is only shown while the post is open. */}
            {post.status === 'OPEN' ? (
              <Link href={`/hiring-posts/${post.id}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Open the hiring post
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </>
        ) : null}

        <h3 className="mt-6 font-display text-base font-medium">Timeline</h3>
        <div className="mt-2">
          <ApplicationTimeline events={application.events} />
        </div>
      </div>

      <div className="border-t border-border bg-surface py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pl-4 pr-28 sm:pl-6 sm:pr-28 lg:pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" disabled={!recruiterId} onClick={openChat}>
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Message {firstName}
          </Button>
          {canWithdraw ? (
            <Button type="button" variant="danger" className="ml-auto" disabled={pending} onClick={() => setDialog('withdraw')}>Withdraw application</Button>
          ) : null}
        </div>
      </div>

      <ConfirmActionDialog
        open={dialog === 'accept'}
        title="Accept this offer?"
        description={`${company} hires you for ${post?.title ?? 'this role'}.`}
        confirmLabel="Accept offer"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => void fromDialog({ type: 'accept' })}
      />
      <ConfirmActionDialog
        open={dialog === 'decline'}
        title="Decline this offer?"
        description="This cannot be undone."
        confirmLabel="Decline"
        noteLabel={`Note to ${firstName}`}
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={(note) => void fromDialog({ type: 'decline', note })}
      />
      <ConfirmActionDialog
        open={dialog === 'withdraw'}
        title="Withdraw this application?"
        description={`${company} is told. You can apply again later.`}
        confirmLabel="Withdraw application"
        tone="danger"
        pending={pending}
        error={dialogError}
        onCancel={closeDialog}
        onConfirm={() => void fromDialog({ type: 'withdraw' })}
      />
    </article>
  )
}

/** Shown while the full application loads: mirrors the real header row above h2 and sticky footer, with no active buttons. */
export function MyApplicationPanelLoading({ row, backHref }: { row?: ApplicationDetail; backHref: string }) {
  const post = row?.hiringPost
  const company = post?.companyName || post?.recruiter?.name || 'Application'
  return (
    <article className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface max-lg:h-full max-lg:rounded-none max-lg:border-0" aria-busy="true" aria-label={`${post?.title ?? 'Application'}, loading`}>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Link href={backHref} scroll={false} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary lg:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All applications
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {row ? (
            <Avatar name={company} src={post?.recruiter?.avatar} size="lg" />
          ) : (
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          )}
          <div className="min-w-0 flex-1 basis-40">
            {row ? (
              <p className="truncate font-medium">{company}</p>
            ) : (
              <Skeleton className="h-4 w-36" />
            )}
            <Skeleton className="mt-1.5 h-3.5 w-48 max-w-full" />
          </div>
          {row ? <StatusBadge status={row.status} viewer="candidate" reason={row.statusReason} /> : <Skeleton className="h-6 w-20 rounded-full" />}
        </div>

        {post?.title ? (
          <h2 className="mt-4 break-words font-display text-xl font-medium leading-tight">{post.title}</h2>
        ) : (
          <Skeleton className="mt-4 h-7 w-2/3" />
        )}
        <Skeleton className="mt-5 h-16 w-full rounded-lg" />
        <Skeleton className="mt-5 h-24 w-full rounded-lg" />
        <Skeleton className="mt-4 h-20 w-full rounded-lg" />
      </div>
      <div className="border-t border-border bg-surface py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pl-4 pr-28 sm:pl-6 sm:pr-28 lg:pb-3" aria-hidden="true">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="ml-auto h-10 w-40 rounded-lg" />
        </div>
      </div>
    </article>
  )
}
