import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { JobEditPage } from '@/features/jobs/components/form/job-edit-page'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'

export const metadata: Metadata = { title: 'Edit your post' }

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const jobId = positiveIntegerRouteParam((await params).id)
  if (!jobId) notFound()
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <JobEditPage jobId={jobId} />
    </RequireAuth>
  )
}
