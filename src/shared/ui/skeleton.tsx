import { cn } from '@/shared/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-surface-muted', className)} aria-hidden="true" />
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  )
}

export function ListRowSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-60 flex-1 space-y-3">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  )
}
