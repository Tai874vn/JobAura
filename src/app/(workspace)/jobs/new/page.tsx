import { RequireAuth } from '@/features/auth/require-auth'
import { JobForm } from '@/features/jobs/job-form'

export default function NewJobPage() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <JobForm />
    </RequireAuth>
  )
}
