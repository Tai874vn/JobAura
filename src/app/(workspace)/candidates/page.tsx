/**
 * Candidate directory page at /candidates. Lets signed-in employers and admins browse and search for candidates.
 *
 * Calls: RequireAuth; CandidateDirectoryPage
 * Used by:
 *   - Next.js router: page for /candidates
 */

import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { CandidateDirectoryPage } from '@/features/candidates/components/candidate-directory-page'

export const metadata: Metadata = { title: 'Find candidates' }

// Page /candidates — renders <CandidateDirectoryPage> (features/candidates/components/candidate-directory-page.tsx) (sign-in required).
// Page settings: src/features/candidates/config/candidates.ts
export default function CandidatesPage() {
  return (
    <RequireAuth allowedRoles={['employer', 'admin']}>
      <CandidateDirectoryPage />
    </RequireAuth>
  )
}
