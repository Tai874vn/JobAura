import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: categories' }

export default function AdminJobTypesPage() {
  return <AdminResourcePage resource="categories" />
}
