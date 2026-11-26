import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { RecommendedCandidatesPage } from '@/features/candidates/components/recommended-candidates/recommended-candidates-page'

export const metadata: Metadata = { title: 'AI candidate matching' }

// Page /recommendations/candidates — renders <RecommendedCandidatesPage> (features/candidates/components/recommended-candidates/recommended-candidates-page.tsx) (sign-in required).
// Page settings: src/features/candidates/config/ai-matching.ts
export default function CandidateRecommendationsRoute() {
  return (
    <RequireAuth allowedRoles={['employer', 'admin']}>
      <RecommendedCandidatesPage />
    </RequireAuth>
  )
}
