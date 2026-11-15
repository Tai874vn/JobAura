'use client'

import dynamic from 'next/dynamic'
import { useSession } from '@/features/auth/use-session'
import { Skeleton } from '@/shared/ui'

const MyHiringPostsPage = dynamic(
  () => import('@/features/hiring/my-hiring-posts-page').then((module) => module.MyHiringPostsPage),
  { loading: RoleHomeLoading, ssr: false }
)
const FeedPage = dynamic(
  () => import('./feed-page').then((module) => module.FeedPage),
  { loading: RoleHomeLoading, ssr: false }
)

export function RoleHomePage() {
  const { user } = useSession()
  const role = user?.role

  // A recruiter's home is their own hiring posts: status, applicants, and matching for each.
  if (role === 'employer') return <MyHiringPostsPage />

  return <FeedPage />
}

function RoleHomeLoading() {
  return (
    <div className="container-page grid gap-6 py-8 lg:grid-cols-[240px_1fr_280px]" aria-hidden="true">
      <div className="hidden space-y-3 lg:block">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <div className="hidden space-y-3 lg:block">
        <Skeleton className="h-40" />
        <Skeleton className="h-36" />
      </div>
    </div>
  )
}
