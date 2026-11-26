import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/components/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: comments' }

// Page /admin/comments — renders <AdminResourcePage> (features/admin/components/admin-resource-page.tsx).
export default function AdminCommentsPage() {
  return <AdminResourcePage resource="comments" />
}
