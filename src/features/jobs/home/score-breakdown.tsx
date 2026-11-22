import { Check } from 'lucide-react'
import { MatchScore } from '@/features/jobs/recommendation-ui'
import { Section } from '@/shared/ui'
import { sampleBreakdown, sampleCandidates, samplePost } from './sample-shortlist'

/** Opens up the top row of the hero shortlist: what each requirement asked for and what the resume showed. */
export function ScoreBreakdown() {
  const top = sampleCandidates[0]
  return (
    <Section id="ranking" tone="surface" className="border-b border-border">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="min-w-0 max-w-md">
          <h2 className="font-display text-3xl font-medium">Why {top.name.split(' ').at(-1)} ranks first</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Every candidate is compared with the hiring post on the same four points. Occupations come from ESCO, the EU’s
            standard list of jobs, years count time in that occupation, and the level is read from the work described in the resume.
          </p>
          <p className="mt-4 text-base leading-7 text-muted">
            Recruiters see the matched and missing skills next to each score, and candidates see which skills they still need.
          </p>
        </div>

        <figure aria-label="Example score breakdown for the top candidate" className="min-w-0 rounded-2xl border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-5 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs text-muted">{samplePost.title} · Example</p>
              <p className="mt-1 font-display text-lg font-medium">{top.name}</p>
            </div>
            <MatchScore score={top.score} label="high_match" className="[&>span:first-child]:text-xl" />
          </div>
          <dl className="divide-y divide-border">
            {sampleBreakdown.map((row) => (
              <div key={row.factor} className="grid grid-cols-1 gap-x-6 gap-y-1 px-4 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:px-6">
                <dt className="text-sm text-muted">
                  {row.factor}
                  <span className="block text-xs">Asks for {row.required}</span>
                </dt>
                <dd className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span className="min-w-0">{row.found}</span>
                </dd>
              </div>
            ))}
          </dl>
        </figure>
      </div>
    </Section>
  )
}
