'use client'

import { usePathname } from 'next/navigation'
import { RequireAuth } from '@/features/auth/require-auth'
import { ContractsPageSkeleton } from '@/features/contracts/contracts-skeleton'
import { MyHiringPostsPageSkeleton } from '@/features/hiring/hiring-posts-skeleton'
import { ApplicantsPageSkeleton, MyApplicationsPageSkeleton } from '@/features/hiring-pipeline/split-pane-skeletons'

export type WorkspaceSkeletonKind =
  | 'contracts'
  | 'my-applications'
  | 'applicants'
  | 'my-hiring-posts'
  | null

const APPLICANTS_PATH = /^\/my-hiring-posts\/[^/]+\/applicants$/

/** Picks the layout-matching page skeleton for workspace routes while the layout guard checks the session. */
export function workspaceSkeletonForPathname(pathname: string | null | undefined): WorkspaceSkeletonKind {
  if (!pathname) return null
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (normalized === '/contracts') return 'contracts'
  if (normalized === '/my-applications') return 'my-applications'
  if (APPLICANTS_PATH.test(normalized)) return 'applicants'
  if (normalized === '/my-hiring-posts') return 'my-hiring-posts'
  return null
}

function renderWorkspaceSkeleton(kind: WorkspaceSkeletonKind) {
  switch (kind) {
    case 'contracts':
      return <ContractsPageSkeleton />
    case 'my-applications':
      return <MyApplicationsPageSkeleton />
    case 'applicants':
      return <ApplicantsPageSkeleton />
    case 'my-hiring-posts':
      return <MyHiringPostsPageSkeleton />
    case null:
      return undefined
  }
}

export function WorkspaceRequireAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const fallback = renderWorkspaceSkeleton(workspaceSkeletonForPathname(pathname))
  return <RequireAuth fallback={fallback}>{children}</RequireAuth>
}
