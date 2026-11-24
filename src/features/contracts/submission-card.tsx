import Image from 'next/image'
import type { SubmissionView } from '@/shared/schemas'
import { formatPipelineTime } from '@/features/hiring-pipeline/format-time'

/** The host of a link ("example.com"), so a long address does not fill the card. */
function linkLabel(link: string): string {
  try {
    return new URL(link).host
  } catch {
    return link
  }
}

/** One piece of work the freelancer sent for a milestone, with the client's feedback under it (if any). */
export function SubmissionCard({ submission }: { submission: SubmissionView }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-3">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h4 className="font-display text-sm font-medium">Submission {submission.number}</h4>
        <p className="text-xs text-muted">{formatPipelineTime(submission.createdAt)}</p>
      </header>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{submission.note}</p>

      {submission.images.length ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Images">
          {submission.images.map((url, i) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright">
                <Image src={url} alt={`Image ${i + 1} of submission ${submission.number}, opens full size`} width={96} height={96} className="h-24 w-24 object-cover" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {submission.links.length ? (
        <ul className="mt-3 space-y-1" aria-label="Links">
          {submission.links.map((link) => (
            <li key={link} className="min-w-0 text-sm">
              <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline-offset-2 hover:underline">
                {linkLabel(link)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {submission.feedback ? (
        <div className="mt-3 rounded-md bg-surface-muted p-3">
          <p className="text-xs font-medium text-muted">Client feedback</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{submission.feedback}</p>
        </div>
      ) : null}
    </article>
  )
}
