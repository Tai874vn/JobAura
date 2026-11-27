/**
 * Admin categories page at /admin/categories. Lets admins view and manage job categories.
 *
 * Calls: AdminResourcePage
 * Used by:
 *   - Next.js router: page for /admin/categories
 */

import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/components/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: categories' }

// Page /admin/categories — renders <AdminResourcePage> (features/admin/components/admin-resource-page.tsx).
export default function AdminJobTypesPage() {
  return <AdminResourcePage resource="categories" />
}
