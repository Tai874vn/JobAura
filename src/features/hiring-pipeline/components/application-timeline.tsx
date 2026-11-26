import type { ApplicationEvent } from '@/shared/schemas'
import { formatPipelineTime } from '../utils/format-time'

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const modeWords: Record<string, string> = { ONLINE: 'online', ONSITE: 'onsite', PHONE: 'phone' }

/** "some_new_type" becomes "Some new type", so a type the frontend does not know yet still reads well. */
function humanize(type: string) {
  const words = type.replace(/_/g, ' ').trim()
  return words ? words[0].toUpperCase() + words.slice(1) : 'Update'
}

/** One line for a history row: the title, and a smaller detail line when the row has one. */
export function describeEvent(event: ApplicationEvent): { title: string; detail?: string } {
  const data = event.data ?? {}
  const note = text(data.note)
  const time = (value: unknown) => (typeof value === 'string' ? formatPipelineTime(value) : '')
  switch (event.type) {
    case 'applied':
      return { title: 'Applied' }
    case 'reapplied':
      return { title: 'Applied again' }
    case 'shortlisted':
      return { title: 'Shortlisted' }
    case 'rejected': {
      const title = data.reason === 'POSITION_FILLED' ? 'Position filled' : data.reason === 'POST_CLOSED' ? 'Post closed' : 'Not selected'
      return { title, detail: note ?? undefined }
    }
    case 'offer_sent':
      return { title: 'Offer sent', detail: note ?? undefined }
    case 'offer_withdrawn':
      return { title: 'Offer withdrawn' }
    case 'offer_declined':
      return { title: 'Offer declined', detail: note ?? undefined }
    case 'hired':
      return { title: 'Hired' }
    case 'withdrawn':
      return { title: 'Withdrawn' }
    case 'interview_requested': {
      const times = Array.isArray(data.proposedTimes) ? data.proposedTimes.map(time).filter(Boolean) : []
      const mode = typeof data.mode === 'string' ? modeWords[data.mode] : undefined
      return {
        title: `Interview ${typeof data.round === 'number' ? `${data.round} ` : ''}requested${mode ? ` (${mode})` : ''}`,
        detail: times.length ? times.join(' · ') : undefined,
      }
    }
    case 'interview_times_proposed': {
      const times = Array.isArray(data.proposedTimes) ? data.proposedTimes.map(time).filter(Boolean) : []
      return { title: 'New interview times sent', detail: times.length ? times.join(' · ') : undefined }
    }
    case 'interview_booked':
      return { title: 'Interview booked', detail: time(data.scheduledAt) || undefined }
    case 'interview_reschedule_requested':
      return { title: 'Other times asked for', detail: note ?? undefined }
    case 'interview_cancelled': {
      const by = data.by === 'recruiter' ? 'the recruiter' : data.by === 'candidate' ? 'the candidate' : null
      return { title: by ? `Interview cancelled by ${by}` : 'Interview cancelled', detail: note ?? undefined }
    }
    case 'interview_completed':
      return { title: 'Interview done' }
    default:
      return { title: humanize(event.type) }
  }
}

/** The history of one application, oldest first, as the backend sends it. */
export function ApplicationTimeline({ events }: { events: ApplicationEvent[] }) {
  if (!events.length) return <p className="text-sm text-muted">No history yet.</p>
  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const { title, detail } = describeEvent(event)
        return (
          <li key={event.id} className="relative pl-5">
            <span aria-hidden className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm font-medium">{title}</p>
            {detail ? <p className="mt-0.5 break-words text-sm text-muted">{detail}</p> : null}
            <p className="mt-0.5 text-xs text-muted">
              {formatPipelineTime(event.createdAt)}
              {event.actor ? ` · ${event.actor.name}` : ''}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
