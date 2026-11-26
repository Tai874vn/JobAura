import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { JobForm } from '@/features/jobs/components/form/job-form'

export const metadata: Metadata = { title: 'Post your portfolio' }

export default function NewJobPage() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <JobForm />
    </RequireAuth>
  )
}
