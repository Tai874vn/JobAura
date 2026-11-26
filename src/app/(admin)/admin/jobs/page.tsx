import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/components/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: portfolio posts' }

// Page /admin/jobs — renders <AdminResourcePage> (features/admin/components/admin-resource-page.tsx).
export default function AdminJobsPage() {
  return <AdminResourcePage resource="jobs" />
}
