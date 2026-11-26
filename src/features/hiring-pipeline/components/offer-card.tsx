import type { ApplicationDetail } from '@/shared/schemas'
import { Button } from '@/shared/ui'
import { formatApplicantDay } from '../utils/applicant-format'

/**
 * The offer the candidate can answer. It draws only while the status is OFFERED, so an offer that was withdrawn
 * (or already answered) never leaves an Accept or Decline button on screen. The panel owns the confirm dialogs.
 */
export function OfferCard({
  application,
  company,
  pending = false,
  onAccept,
  onDecline,
}: {
  application: Pick<ApplicationDetail, 'status' | 'offerNote' | 'offeredAt'>
  company: string
  pending?: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  if (application.status !== 'OFFERED') return null
  return (
    <section aria-label="Offer" className="rounded-lg border border-primary/40 bg-primary/[0.04] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="min-w-0 break-words text-sm font-medium">Offer from {company}</h3>
        {application.offeredAt ? <span className="text-xs text-muted">Sent {formatApplicantDay(application.offeredAt)}</span> : null}
      </div>
      {application.offerNote?.trim() ? (
        <p className="mt-2 whitespace-pre-line break-words text-sm leading-6">{application.offerNote}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">No note with this offer.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={pending} onClick={onAccept}>Accept offer</Button>
        <Button variant="secondary" disabled={pending} onClick={onDecline}>Decline</Button>
      </div>
    </section>
  )
}
