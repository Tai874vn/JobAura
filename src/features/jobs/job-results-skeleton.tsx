import { Skeleton } from '@/shared/ui'

/** Loading placeholders for the stacked portfolio result cards while a query is pending. */
export function JobResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading portfolio posts" className="mt-4 grid gap-4">
      <span className="sr-only">Loading portfolio posts</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-xl border border-border bg-surface" aria-hidden="true" />
      ))}
    </div>
  )
}

/** Page-level fallback skeleton matching the BrowsePage layout (hero, search band, sidebar, results). */
export function JobsPageSkeleton() {
  return (
    <div className="hiring-theme bg-background text-foreground" aria-busy="true">
      <section className="border-b border-border bg-surface-muted">
        <div className="container-page py-8 lg:py-10">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="mt-2 h-5 w-96 max-w-full" />
          <Skeleton className="mt-5 h-16 w-full rounded-xl" />
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((id) => (
              <Skeleton key={id} className="h-9 w-28 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[256px_minmax(0,1fr)] lg:py-10">
        <aside className="hidden lg:block" aria-hidden="true">
          <Skeleton className="h-96 w-full rounded-xl" />
        </aside>
        <div className="min-w-0">
          <Skeleton className="h-8 w-48" />
          <JobResultsSkeleton />
        </div>
      </div>
    </div>
  )
}
