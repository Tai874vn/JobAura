import { Card, CardContent, Skeleton } from '@/shared/ui'

/** Structured placeholders matching HiringPostResultCard (company tile, title, salary, meta, skills, footer). */
export function HiringPostResultSkeleton({ count = 3 }: { count?: number } = {}) {
  return (
    <div role="status" aria-label="Loading hiring posts" className="mt-4 grid gap-4">
      <span className="sr-only">Loading hiring posts</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-xl border border-border bg-surface p-5 sm:p-6"
          aria-hidden="true"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <Skeleton className="size-[46px] shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <div className="space-y-1.5 sm:w-[212px] sm:shrink-0">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-20 rounded-[5px]" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2, 3].map((chip) => (
              <Skeleton key={chip} className="h-7 w-20 rounded-md" />
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
            <Skeleton className="h-4 w-40 sm:mr-auto" />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Skeleton className="h-[42px] w-full rounded-lg sm:w-28" />
              <Skeleton className="h-[42px] w-full rounded-lg sm:w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Page-level skeleton mirroring /hiring-posts on BrowsePage (hero, sticky search, explore chips, 256px sidebar, cards). */
export function HiringPostsPageSkeleton() {
  return (
    <div className="hiring-theme bg-background text-foreground" aria-busy="true">
      <section className="border-b border-border bg-surface-muted">
        <div className="container-page py-8 lg:py-10">
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="mt-2 h-5 w-[520px] max-w-full" />
          <Skeleton className="mt-5 h-[68px] w-full rounded-xl" />
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((id) => (
              <Skeleton key={id} className="h-9 w-32 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[256px_minmax(0,1fr)] lg:py-10">
        <aside className="hidden space-y-4 lg:block" aria-hidden="true">
          <div className="space-y-5 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-4 w-40" />
            {[0, 1, 2].map((group) => (
              <div key={group} className="space-y-2.5 border-t border-border pt-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-[42px] w-36 rounded-lg" />
          </div>
          <HiringPostResultSkeleton />
        </div>
      </div>
    </div>
  )
}

/** Structured placeholders matching MyHiringPostResultCard (badges, title, facts, pipeline line, footer buttons). */
export function MyHiringPostResultSkeleton({ count = 3 }: { count?: number } = {}) {
  return (
    <div role="status" aria-label="Loading your hiring posts" className="mt-4 grid gap-4">
      <span className="sr-only">Loading your hiring posts</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-xl border border-border bg-surface p-5 sm:p-6"
          aria-hidden="true"
        >
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-36 rounded-md" />
          </div>
          <Skeleton className="h-7 w-2/3" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-64 max-w-full" />
          <div className="flex flex-col gap-3 border-t border-border pt-3 xl:flex-row xl:items-center">
            <Skeleton className="h-4 w-48 xl:mr-auto" />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Skeleton className="h-10 w-full rounded-lg sm:w-32" />
              <Skeleton className="h-10 w-full rounded-lg sm:w-20" />
              <Skeleton className="h-10 w-full rounded-lg sm:w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Page-level skeleton mirroring /my-hiring-posts on BrowsePage. */
export function MyHiringPostsPageSkeleton() {
  return (
    <div className="hiring-theme bg-background text-foreground" aria-busy="true">
      <section className="border-b border-border bg-surface-muted">
        <div className="container-page py-8 lg:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-10 w-60" />
              <Skeleton className="h-5 w-96 max-w-full" />
            </div>
            <Skeleton className="h-[42px] w-40 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-[68px] w-full rounded-xl" />
        </div>
      </section>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[256px_minmax(0,1fr)] lg:py-10">
        <aside className="hidden lg:block" aria-hidden="true">
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-4 w-40" />
            <div className="space-y-2.5 border-t border-border pt-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-[42px] w-36 rounded-lg" />
          </div>
          <MyHiringPostResultSkeleton />
        </div>
      </div>
    </div>
  )
}

/** Route-level loading fallback mirroring HiringPostDetailView (back link, detail card, sticky sidebar). */
export function HiringPostDetailSkeleton() {
  return (
    <div className="container-page py-8" aria-busy="true" role="status" aria-label="Loading hiring post">
      <span className="sr-only">Loading hiring post</span>
      <Skeleton className="h-4 w-28" />
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-9 w-3/4 sm:h-10" />
            <div className="mt-3 flex flex-wrap gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>

            <div className="mt-6 space-y-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            <div className="mt-6 space-y-3">
              <Skeleton className="h-6 w-32" />
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((chip) => (
                  <Skeleton key={chip} className="h-6 w-20 rounded-md" />
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>

        <aside className="grid gap-4 lg:sticky lg:top-24" aria-hidden="true">
          <Card>
            <CardContent className="grid gap-3 p-5">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
