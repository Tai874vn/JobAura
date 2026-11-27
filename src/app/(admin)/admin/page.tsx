/**
 * Admin home page at /admin. Shows the main admin dashboard overview.
 *
 * Calls: AdminDashboard
 * Used by:
 *   - Next.js router: page for /admin
 */

import type { Metadata } from 'next'
import { AdminDashboard } from '@/features/admin/components/admin-dashboard'

export const metadata: Metadata = { title: 'Admin' }

// Page /admin — renders <AdminDashboard> (features/admin/components/admin-dashboard.tsx).
export default function AdminPage() {
  return <AdminDashboard />
}
