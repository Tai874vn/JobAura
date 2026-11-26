import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/components/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: users' }

// Page /admin/users — renders <AdminResourcePage> (features/admin/components/admin-resource-page.tsx).
export default function AdminUsersPage() {
  return <AdminResourcePage resource="users" />
}
