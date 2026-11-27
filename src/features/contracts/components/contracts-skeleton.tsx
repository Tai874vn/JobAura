/**
 * Loading placeholder skeletons for the /contracts page and its list of proposals and contracts.
 * Mirrors the split-pane page layout and list card structure while data loads.
 *
 * Calls: PanelLoading
 * Used by:
 *   - app/(workspace)/contracts/page.tsx
 *   - features/contracts/components/contracts-page.tsx
 *   - features/workspace/components/workspace-require-auth.tsx
 */

import { Skeleton } from '@/shared/ui'
import { PanelLoading } from './panel-frame'

/** Five bordered card placeholders mirroring ContractListItem rows. */
export function ContractsListSkeleton({ count = 5 }: { count?: number } = {}) {
  return (
    <div className="grid gap-2" aria-busy="true" role="status" aria-label="Loading contracts">
      <span className="sr-only">Loading contracts</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-border bg-surface p-4" aria-hidden="true">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Page-level Suspense fallback mirroring ContractsPage (heading, tabs, filter chips, 2fr/3fr split pane). */
export function ContractsPageSkeleton() {
  return (
    <div className="hiring-theme flex flex-col bg-background text-foreground lg:h-[calc(100dvh-4rem)] lg:overflow-hidden" aria-busy="true">
      <div className="container-page flex min-h-0 flex-1 flex-col pb-6 pt-6 lg:pb-4">
        <div className="flex-none">
          <Skeleton className="h-8 w-36 sm:h-9" />
          <div className="mt-4 flex gap-4 border-b border-border pb-2.5" aria-hidden="true">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((chip) => (
              <Skeleton key={chip} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-h-0 min-w-0">
            <ContractsListSkeleton />
          </div>
          <div className="hidden min-h-0 min-w-0 lg:block">
            <PanelLoading backHref="/contracts" />
          </div>
        </div>
      </div>
    </div>
  )
}
