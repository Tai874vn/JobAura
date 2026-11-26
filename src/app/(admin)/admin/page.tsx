import type { Metadata } from 'next'
import { AdminDashboard } from '@/features/admin/components/admin-dashboard'

export const metadata: Metadata = { title: 'Admin' }

// Page /admin — renders <AdminDashboard> (features/admin/components/admin-dashboard.tsx).
export default function AdminPage() {
  return <AdminDashboard />
}
