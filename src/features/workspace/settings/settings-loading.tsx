import { Card, CardContent, Skeleton } from '@/shared/ui'

/** Matches the Overview panel (summary card with strength bar + 2-column quick-action cards). */
export function SettingsOverviewSkeleton() {
  return (
    <div role="status" aria-label="Loading settings overview" className="space-y-5">
      <span className="sr-only">Loading settings…</span>
      <Card className="overflow-hidden border-l-4 border-l-border" aria-hidden="true">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          <div className="mt-6 space-y-2.5 border-t border-border pt-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3.5 w-48" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        {[0, 1].map((item) => (
          <Card key={item}>
            <CardContent className="flex h-full flex-col gap-3 p-5 sm:p-6">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-2 h-10 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Matches dynamically loaded form panels (ProfileSettingsEditor / ResumeSettingsEditor) without phantom headings. */
export function SettingsPanelSkeleton() {
  return (
    <div role="status" aria-label="Loading settings" className="space-y-4">
      <span className="sr-only">Loading settings…</span>
      {[1, 2].map((item) => (
        <Card key={item} className="space-y-4 p-5 sm:p-6" aria-hidden="true">
          <Skeleton className="h-5 w-36" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
        </Card>
      ))}
    </div>
  )
}

/** Matches SettingsPage 1:1: bordered header, 224px bordered sidebar card, and overview cards. */
export function SettingsLoading() {
  return (
    <div className="container-page py-8 sm:py-10" aria-busy="true">
      <header className="mb-7 border-b border-border pb-6">
        <Skeleton className="h-9 w-36 sm:h-10" />
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0" aria-hidden="true">
          <div className="flex gap-2 rounded-xl border border-border bg-surface p-2 lg:flex-col">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex flex-1 items-center gap-2 rounded-lg px-2 py-3 lg:flex-none lg:px-3">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="hidden h-3 w-28 lg:block" />
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0">
          <SettingsOverviewSkeleton />
        </div>
      </div>
    </div>
  )
}
