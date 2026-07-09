import { RequireAuth } from '@/features/auth/require-auth'
import { RecommendedCandidatesPage } from '@/features/candidates/recommended-candidates-page'

export default function CandidateRecommendationsRoute() {
  return (
    <RequireAuth allowedRoles={['employer', 'admin']}>
      <RecommendedCandidatesPage />
    </RequireAuth>
  )
}
