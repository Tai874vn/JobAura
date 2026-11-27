/**
 * Loading skeletons for the split-pane hiring pipeline pages.
 * Provides placeholders for the application list, the recruiter applicants page, and the candidate My Applications page while data or routes load.
 *
 * Calls: nothing from this project
 * Used by:
 *   - app/(workspace)/my-applications/page.tsx
 *   - app/(workspace)/my-hiring-posts/[id]/applicants/page.tsx
 *   - features/hiring-pipeline/components/applicants/applicants-page.tsx
 *   - features/hiring-pipeline/components/my-applications/my-applications-page.tsx
 *   - features/workspace/components/workspace-require-auth.tsx
 */

import { Skeleton } from '@/shared/ui'

/** Five bordered card placeholders mirroring ApplicantListItem / MyApplicationListItem rows. */
export function PipelineListSkeleton({ count = 5 }: { count?: number } = {}) {
  return (
    <div className="grid gap-2" aria-busy="true" role="status" aria-label="Loading applications">
      <span className="sr-only">Loading applications</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-border bg-surface p-4" aria-hidden="true">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-48 max-w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Shared right-pane skeleton body for ApplicantsPageSkeleton and MyApplicationsPageSkeleton. */
function SplitDetailSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface" aria-hidden="true">
      <div className="flex-1 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-5 h-6 w-2/3" />
        <Skeleton className="mt-5 h-24 w-full rounded-lg" />
        <Skeleton className="mt-4 h-28 w-full rounded-lg" />
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="ml-auto h-10 w-28 rounded-lg" />
      </div>
    </div>
  )
}

/** Page-level Suspense fallback mirroring ApplicantsPage (header, status tabs, 2fr/3fr split pane). */
export function ApplicantsPageSkeleton() {
  return (
    <div className="hiring-theme flex flex-col bg-background text-foreground lg:h-[calc(100dvh-4rem)] lg:overflow-hidden" aria-busy="true">
      <div className="container-page flex min-h-0 flex-1 flex-col pb-6 pt-6 lg:pb-4">
        <div className="flex-none">
          <Skeleton className="h-4 w-28" />
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 max-w-full sm:h-9" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
          <div className="mt-4 flex gap-3 border-b border-border pb-2.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((tab) => (
              <Skeleton key={tab} className="h-5 w-16" />
            ))}
          </div>
        </div>
        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-h-0 min-w-0">
            <PipelineListSkeleton />
          </div>
          <div className="hidden min-h-0 min-w-0 lg:block">
            <SplitDetailSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Page-level Suspense fallback mirroring MyApplicationsPage (heading + 2fr/3fr split pane). */
export function MyApplicationsPageSkeleton() {
  return (
    <div className="hiring-theme flex flex-col bg-background text-foreground lg:h-[calc(100dvh-4rem)] lg:overflow-hidden" aria-busy="true">
      <div className="container-page flex min-h-0 flex-1 flex-col pb-6 pt-6 lg:pb-4">
        <div className="flex-none">
          <Skeleton className="h-8 w-48 sm:h-9" />
        </div>
        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-h-0 min-w-0">
            <PipelineListSkeleton />
          </div>
          <div className="hidden min-h-0 min-w-0 lg:block">
            <SplitDetailSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
