'use client'

import { CandidateDirectoryPage } from '@/features/candidates/candidate-directory-page'
import { useAuthStore } from '@/shared/stores/auth-store'
import { FeedPage } from './feed-page'

export function RoleHomePage() {
  const role = useAuthStore((state) => state.user?.role)

  if (role === 'employer') return <CandidateDirectoryPage />

  return <FeedPage />
}
