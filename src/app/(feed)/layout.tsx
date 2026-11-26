import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { Footer } from '@/features/layout/components/footer'
import { SiteHeader } from '@/features/layout/components/site-header'
import { Card, Skeleton } from '@/shared/ui'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

/** Matches the 3-column feed grid while session access is checked inside the shared header/footer frame. */
function FeedAccessSkeleton() {
  return (
    <div className="container-page py-5" aria-hidden="true">
      <div className="grid w-full items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">
          <Card className="overflow-hidden">
            <Skeleton className="h-20 w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="-mt-10 h-12 w-12 rounded-full border-2 border-surface" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        </aside>
        <div className="min-w-0 space-y-4">
          <Card className="p-5"><Skeleton className="h-12 w-full" /></Card>
          <Card className="p-5"><Skeleton className="h-36 w-full" /></Card>
          <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
        </div>
        <aside className="hidden space-y-4 xl:block">
          <Card className="space-y-3 p-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </Card>
          <Card className="space-y-3 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full" />
          </Card>
        </aside>
      </div>
    </div>
  )
}

// Layout for every page in app/(feed)/ — renders <Footer> (features/layout/components/footer.tsx), <SiteHeader> (features/layout/components/site-header.tsx) (sign-in required).
export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex min-w-0 flex-1 flex-col">
        <RequireAuth allowedRoles={['user', 'admin']} anonymousRedirect="/welcome" fallback={<FeedAccessSkeleton />}>
          {children}
        </RequireAuth>
      </main>
      <Footer />
    </div>
  )
}
