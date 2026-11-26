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
