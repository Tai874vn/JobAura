/**
 * Loading placeholder skeletons for the /jobs browse page.
 * Exports card-list placeholders matching JobResultCard and a full-page fallback matching the browse layout.
 *
 * Calls: nothing from this project
 * Used by:
 *   - app/(marketplace)/jobs/loading.tsx
 *   - app/(marketplace)/jobs/page.tsx
 *   - features/jobs/components/browse/job-list-view.tsx
 */

import { Skeleton } from '@/shared/ui'

/** Loading placeholders mirroring JobResultCard (avatar, title, price, summary, footer actions). */
export function JobResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading portfolio posts" className="mt-4 grid gap-4">
      <span className="sr-only">Loading portfolio posts</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-xl border border-border bg-surface p-5 sm:p-6"
          aria-hidden="true"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
              <Skeleton className="size-[46px] shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-36" />
                <div className="flex gap-1.5 pt-0.5">
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-6 w-28 rounded-md" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 sm:flex sm:w-[212px] sm:shrink-0 sm:flex-col sm:items-end">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
            <Skeleton className="h-4 w-28 sm:mr-auto" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-[42px] w-20 rounded-lg" />
              <Skeleton className="h-[42px] w-28 rounded-lg" />
              <Skeleton className="h-[42px] w-36 rounded-lg" />
            </div>
          </div>
        </div>
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
