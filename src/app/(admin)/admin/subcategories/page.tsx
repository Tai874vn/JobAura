import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: subcategories' }

export default function AdminJobDetailTypesPage() {
  return <AdminResourcePage resource="subcategories" />
}
