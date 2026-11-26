import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/components/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: categories' }

// Page /admin/categories — renders <AdminResourcePage> (features/admin/components/admin-resource-page.tsx).
export default function AdminJobTypesPage() {
  return <AdminResourcePage resource="categories" />
}
