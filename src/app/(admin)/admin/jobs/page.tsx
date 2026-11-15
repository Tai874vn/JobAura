import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: portfolio posts' }

export default function AdminJobsPage() {
  return <AdminResourcePage resource="jobs" />
}
