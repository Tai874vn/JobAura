import { CardSkeleton, Skeleton } from '@/shared/ui'

export function JobResultsSkeleton() {
  return <div role="status" aria-label="Loading services">
    <span className="sr-only">Loading services</span>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, index) => <CardSkeleton key={index} />)}
    </div>
  </div>
}

export function JobsPageSkeleton() {
  return <div className="container-page flex-1 py-10" aria-busy="true">
    <Skeleton className="h-9 w-60" />
    <Skeleton className="mt-5 h-14 w-full" />
    <div className="my-6 flex flex-wrap gap-2">{[1, 2, 3, 4].map((id) => <Skeleton key={id} className="h-9 w-28 rounded-full" />)}</div>
    <JobResultsSkeleton />
  </div>
}
