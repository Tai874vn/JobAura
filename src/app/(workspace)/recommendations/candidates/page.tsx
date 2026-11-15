import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { RecommendedCandidatesPage } from '@/features/candidates/recommended-candidates-page'

export const metadata: Metadata = { title: 'AI candidate matching' }

export default function CandidateRecommendationsRoute() {
  return (
    <RequireAuth allowedRoles={['employer', 'admin']}>
      <RecommendedCandidatesPage />
    </RequireAuth>
  )
}
