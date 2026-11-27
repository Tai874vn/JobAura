/**
 * Admin subcategories page at /admin/subcategories. Lets admins view and manage job subcategories.
 *
 * Calls: AdminResourcePage
 * Used by:
 *   - Next.js router: page for /admin/subcategories
 */

import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/components/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: subcategories' }

// Page /admin/subcategories — renders <AdminResourcePage> (features/admin/components/admin-resource-page.tsx).
export default function AdminJobDetailTypesPage() {
  return <AdminResourcePage resource="subcategories" />
}
