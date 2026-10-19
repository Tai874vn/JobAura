import { Card, Skeleton } from '@/shared/ui'

export function SettingsPanelSkeleton() {
  return (
    <div role="status" aria-label="Loading settings" className="space-y-4">
      <span className="sr-only">Loading settings…</span>
      <Skeleton className="h-7 w-48" />
      {[1, 2].map((item) => (
        <Card key={item} className="space-y-4 p-5 sm:p-6">
          <Skeleton className="h-5 w-36" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
        </Card>
      ))}
    </div>
  )
}

export function SettingsLoading() {
  return (
    <div className="container-page py-8 sm:py-10">
      <Skeleton className="mb-3 h-9 w-40" />
      <Skeleton className="mb-8 h-4 w-64 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
        <div className="flex gap-2 lg:flex-col" aria-hidden="true">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 flex-1 lg:flex-none" />)}
        </div>
        <SettingsPanelSkeleton />
      </div>
    </div>
  )
}
