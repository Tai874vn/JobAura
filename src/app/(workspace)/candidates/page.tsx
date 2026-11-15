import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { CandidateDirectoryPage } from '@/features/candidates/candidate-directory-page'

export const metadata: Metadata = { title: 'Find candidates' }

export default function CandidatesPage() {
  return (
    <RequireAuth allowedRoles={['employer', 'admin']}>
      <CandidateDirectoryPage />
    </RequireAuth>
  )
}
