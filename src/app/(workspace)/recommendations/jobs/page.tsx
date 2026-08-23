import { RequireAuth } from '@/features/auth/require-auth'
import { RecommendedJobsPage } from '@/features/jobs/recommended-jobs-page'

export default function JobRecommendationsRoute() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <RecommendedJobsPage />
    </RequireAuth>
  )
}
