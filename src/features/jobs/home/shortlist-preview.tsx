import { MatchScore } from '@/features/jobs/recommendation-ui'
import { cn } from '@/shared/lib/utils'
import { samplePost, sampleCandidates } from './sample-shortlist'

/** A static copy of the recruiter shortlist, the result JobAura produces for each hiring post. */
export function ShortlistPreview({ rows = sampleCandidates.length, className }: { rows?: number; className?: string }) {
  const candidates = sampleCandidates.slice(0, rows)
  return (
    <figure
      aria-label="Example ranked shortlist for a hiring post"
      className={cn('min-w-0 rounded-2xl border border-border bg-surface shadow-float', className)}
    >
      <div className="border-b border-border px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted">What a recruiter sees</p>
          <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted">Example</span>
        </div>
        <p className="mt-1 font-display text-lg font-medium">{samplePost.title}</p>
        <p className="mt-0.5 text-sm text-muted">
          {samplePost.location} · {samplePost.minYears}+ years · {samplePost.skills.join(', ')}
        </p>
      </div>
      <ol className="divide-y divide-border">
        {candidates.map((candidate, index) => (
          <li
            key={candidate.name}
            className="grid grid-cols-[16px_36px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:grid-cols-[20px_36px_minmax(0,1fr)_auto] sm:px-6"
          >
            <span className="font-mono text-xs tabular-nums text-muted">{index + 1}</span>
            <span
              aria-hidden="true"
              className={cn(
                'grid h-9 w-9 place-items-center rounded-full text-xs font-medium',
                index === 0 ? 'bg-primary text-white' : 'bg-surface-muted text-muted',
              )}
            >
              {candidate.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{candidate.name}</span>
              <span className="block text-xs text-muted">
                {candidate.occupation} · {candidate.years} yrs · {candidate.level}
              </span>
            </span>
            {/* On phones the score drops under the name instead of squeezing the meta line. */}
            <MatchScore score={candidate.score} showLabel={false} className="col-start-3 sm:col-start-auto" />
          </li>
        ))}
      </ol>
      <figcaption className="flex items-center justify-between gap-4 border-t border-border px-4 py-3.5 text-xs text-muted sm:px-6">
        <span>Ranked by occupation, years, skills, and level</span>
        <span className="hidden font-mono tabular-nums sm:inline">
          Top {candidates.length} of {samplePost.applied}
        </span>
      </figcaption>
    </figure>
  )
}
