/**
 * New portfolio post page at /jobs/new. Shows the portfolio creation form to signed-in candidates and admins.
 *
 * Calls: RequireAuth; JobForm
 * Used by:
 *   - Next.js router: page for /jobs/new
 */

import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { JobForm } from '@/features/jobs/components/form/job-form'

export const metadata: Metadata = { title: 'Post your portfolio' }

// Page /jobs/new — renders <JobForm> (features/jobs/components/form/job-form.tsx) (sign-in required).
export default function NewJobPage() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <JobForm />
    </RequireAuth>
  )
}
