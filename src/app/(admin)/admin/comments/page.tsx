/**
 * Admin comments page at /admin/comments. Lets admins view and manage comments across the site.
 *
 * Calls: AdminResourcePage
 * Used by:
 *   - Next.js router: page for /admin/comments
 */

import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/components/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: comments' }

// Page /admin/comments — renders <AdminResourcePage> (features/admin/components/admin-resource-page.tsx).
export default function AdminCommentsPage() {
  return <AdminResourcePage resource="comments" />
}
