import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: comments' }

export default function AdminCommentsPage() {
  return <AdminResourcePage resource="comments" />
}
