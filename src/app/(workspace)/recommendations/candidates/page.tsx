/**
 * AI candidate matching page (/recommendations/candidates) in the workspace.
 * Checks that the user is signed in as an employer or admin, then shows recommended candidates.
 *
 * Calls: RequireAuth; RecommendedCandidatesPage
 * Used by:
 *   - Next.js router: page for /recommendations/candidates
 */

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
