import type { Metadata } from 'next'
import { RequireAuth } from '@/features/auth/require-auth'
import { MyHiringPostsPage } from '@/features/hiring/my-hiring-posts-page'

export const metadata: Metadata = { title: 'My hiring posts' }

export default function Page() {
  return (
    <RequireAuth allowedRoles={['employer', 'admin']}>
      <MyHiringPostsPage />
    </RequireAuth>
  )
}
