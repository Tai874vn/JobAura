import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { RecommendedJobsPage } from '@/features/jobs/recommended-jobs-page'

export const metadata: Metadata = { title: 'Hiring posts for you' }

export default function JobRecommendationsRoute() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <RecommendedJobsPage />
    </RequireAuth>
  )
}
