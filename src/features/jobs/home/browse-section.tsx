import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Suspense } from 'react'
import { Section } from '@/shared/ui'
import { CategoryGrid } from './category-grid'
import { CategoryGridSkeleton } from './home-skeletons'
import { OccupationLinks } from './trending-skills'

/** One place to start browsing: open roles for candidates, portfolio posts for recruiters. */
export function BrowseSection() {
  return (
    <Section id="browse" tone="surface" className="border-y border-border">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-medium">Open roles by occupation</h2>
          <p className="mt-2 text-sm text-muted">Hiring posts are tagged with an ESCO occupation</p>
          <div className="mt-6">
            <OccupationLinks />
          </div>
          <BrowseLink href="/hiring-posts">All hiring posts</BrowseLink>
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-medium">Portfolios by expertise</h2>
          <p className="mt-2 text-sm text-muted">Candidates’ work, grouped by specialty</p>
          <div className="mt-6">
            {/* Stream categories independently so the static landing hero paints right away. */}
            <Suspense fallback={<CategoryGridSkeleton />}>
              <CategoryGrid />
            </Suspense>
          </div>
          <BrowseLink href="/jobs">All portfolios</BrowseLink>
        </div>
      </div>
    </Section>
  )
}

function BrowseLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-strong">
      {children} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}
