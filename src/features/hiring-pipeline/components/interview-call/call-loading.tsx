/**
 * Loading skeletons for the online interview video call screen.
 * Exports a 2-tile video stage placeholder and a full-page call shell shown while the call or LiveKit loads.
 *
 * Calls: nothing from this project
 * Used by:
 *   - app/interviews/[id]/call/page.tsx
 *   - features/hiring-pipeline/components/interview-call/call-screen.tsx
 */

import { Skeleton } from '@/shared/ui'

/** 2-tile video grid + bottom controls placeholder matching CallStage while LiveKit loads. */
export function CallStageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" role="status" aria-label="Loading video room">
      <span className="sr-only">Loading video room</span>
      <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2" aria-hidden="true">
        <Skeleton className="min-h-56 w-full rounded-xl border border-border" />
        <Skeleton className="min-h-56 w-full rounded-xl border border-border" />
      </div>
      <div className="flex justify-center gap-2 py-2" aria-hidden="true">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  )
}

/** Full-screen call shell skeleton mirroring CallScreen's header, 2-tile stage, and Leave footer. */
export function CallLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground" role="status" aria-label="Loading the call" aria-busy="true">
      <span className="sr-only">Loading the call</span>
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-6" aria-hidden="true">
        <Skeleton className="h-6 w-56 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-32" />
      </header>
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <CallStageSkeleton />
      </div>
      <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6" aria-hidden="true">
        <Skeleton className="h-10 w-20 rounded-lg" />
      </footer>
    </div>
  )
}
