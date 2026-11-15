import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: users' }

export default function AdminUsersPage() {
  return <AdminResourcePage resource="users" />
}
