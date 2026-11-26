import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { RecommendedJobsPage } from '@/features/jobs/components/recommendations/recommended-jobs-page'

export const metadata: Metadata = { title: 'Hiring posts for you' }

// Page /recommendations/jobs — renders <RecommendedJobsPage> (features/jobs/components/recommendations/recommended-jobs-page.tsx) (sign-in required).
export default function JobRecommendationsRoute() {
  return (
    <RequireAuth allowedRoles={['user', 'admin']}>
      <RecommendedJobsPage />
    </RequireAuth>
  )
}
