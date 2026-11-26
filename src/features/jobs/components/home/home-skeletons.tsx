import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardSkeleton, Section, SectionHeading, Skeleton } from '@/shared/ui'

/** Matches CategoryGrid's 8-row 2-column list so the browse block does not jump while categories stream in. */
export function CategoryGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2" role="status" aria-label="Loading categories">
      <li className="sr-only">Loading categories</li>
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className="flex min-h-11 items-center gap-3 border-b border-border py-2" aria-hidden="true">
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
          <Skeleton className="h-4 w-32" />
        </li>
      ))}
    </ul>
  )
}

/** Matches FeaturedServices (heading + 4-column portfolio card grid) while top-rated portfolios load. */
export function FeaturedServicesSkeleton() {
  return (
    <Section id="services" tone="default">
      <SectionHeading
        title="Top-rated portfolios"
        description="Portfolio posts with the highest ratings"
        action={
          <Link
            href="/jobs?sort=rating_desc"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-strong"
          >
            Browse all portfolios <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading top-rated portfolios">
        <span className="sr-only">Loading top-rated portfolios</span>
        {Array.from({ length: 8 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </Section>
  )
}

/** Route-level loading fallback mirroring the /welcome landing hero, browse band, and featured portfolios. */
export function WelcomePageSkeleton() {
  return (
    <div aria-busy="true" role="status" aria-label="Loading JobAura">
      <span className="sr-only">Loading JobAura</span>
      <section className="border-b border-border bg-background">
        <div className="container-page grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-24">
          <div className="min-w-0 max-w-xl">
            <Skeleton className="h-11 w-full sm:h-14" />
            <Skeleton className="mt-2 h-11 w-4/5 sm:h-14" />
            <Skeleton className="mt-5 h-5 w-full" />
            <Skeleton className="mt-2 h-5 w-5/6" />
            <Skeleton className="mt-8 h-14 w-full rounded-xl" />
            <div className="mt-5 flex items-center gap-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
          <Card className="p-5 sm:p-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-2 h-4 w-64 max-w-full" />
            <div className="mt-5 space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48 max-w-full" />
                  </div>
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <Section tone="surface" className="border-y border-border">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-64" />
            <div className="mt-6 flex flex-wrap gap-2">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-32 rounded-md sm:h-9" />
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="mt-2 h-4 w-56" />
            <div className="mt-6">
              <CategoryGridSkeleton />
            </div>
          </div>
        </div>
      </Section>

      <FeaturedServicesSkeleton />
    </div>
  )
}
