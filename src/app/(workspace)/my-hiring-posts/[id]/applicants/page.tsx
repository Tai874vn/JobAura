import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/require-auth'
import { ApplicantsPage } from '@/features/hiring-pipeline/applicants-page'
import { ApplicantsPageSkeleton } from '@/features/hiring-pipeline/split-pane-skeletons'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'

export const metadata: Metadata = { title: 'Applicants' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveIntegerRouteParam((await params).id)
  if (!id) notFound()
  return (
    <RequireAuth allowedRoles={['employer', 'admin']} fallback={<ApplicantsPageSkeleton />}>
      <Suspense fallback={<ApplicantsPageSkeleton />}>
        <ApplicantsPage postId={id} />
      </Suspense>
    </RequireAuth>
  )
}
