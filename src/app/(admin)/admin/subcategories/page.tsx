import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/components/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: subcategories' }

// Page /admin/subcategories — renders <AdminResourcePage> (features/admin/components/admin-resource-page.tsx).
export default function AdminJobDetailTypesPage() {
  return <AdminResourcePage resource="subcategories" />
}
