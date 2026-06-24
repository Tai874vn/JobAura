import { RequireAuth } from '@/features/auth/require-auth'
import { RecommendedJobsPage } from '@/features/jobs/recommended-jobs-page'

export default function JobRecommendationsRoute() {
  return (
    <RequireAuth>
      <RecommendedJobsPage />
    </RequireAuth>
  )
}
