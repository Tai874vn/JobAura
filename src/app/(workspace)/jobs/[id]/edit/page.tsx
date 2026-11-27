/**
 * Portfolio post edit page at /jobs/[id]/edit. Validates the post ID from the URL and shows the edit form to signed-in candidates and admins.
 *
 * Calls: positiveIntegerRouteParam; RequireAuth; JobEditPage
 * Used by:
 *   - Next.js router: page for /jobs/[id]/edit
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { JobEditPage } from '@/features/jobs/components/form/job-edit-page'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'

export const metadata: Metadata = { title: 'Edit your post' }

// Page /jobs/[id]/edit — renders <JobEditPage> (features/jobs/components/form/job-edit-page.tsx) (sign-in required).
export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const jobId = positiveIntegerRouteParam((await params).id)
  if (!jobId) notFound()
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <JobEditPage jobId={jobId} />
    </RequireAuth>
  )
}
