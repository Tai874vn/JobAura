import type { Metadata } from 'next'
import { AdminResourcePage } from '@/features/admin/admin-resource-page'

export const metadata: Metadata = { title: 'Admin: hires' }

export default function AdminHiredJobsPage() {
  return <AdminResourcePage resource="hires" />
}
