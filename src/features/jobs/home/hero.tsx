import { ArrowRight, Search } from 'lucide-react'
import { Button, ButtonLink } from '@/shared/ui'
import { ShortlistPreview } from './shortlist-preview'

export function LandingHero() {
  return (
    <section className="border-b border-border bg-background">
      <div className="container-page grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-24">
        <div className="min-w-0 max-w-xl">
          <h1 className="font-display text-[40px] font-medium leading-[1.06] tracking-[-0.02em] sm:text-6xl sm:tracking-[-0.03em]">
            Find your next role, or the right person for it
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            Candidates apply to open roles and post their portfolio. Recruiters publish a role and get candidates ranked by
            occupation, years in it, skills, and level.
          </p>
          <form action="/hiring-posts" role="search" className="field-shell mt-8 flex rounded-xl border border-border bg-surface p-1.5 shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input
                name="keyword"
                aria-label="Search roles, skills, or companies"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Role, skill, or company"
              />
            </div>
            <Button size="lg" type="submit" className="h-11">
              Search roles
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <span>Hiring?</span>
            <ButtonLink href="/auth/register?role=employer" variant="secondary">
              Post a role <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>

        <ShortlistPreview />
      </div>
    </section>
  )
}
