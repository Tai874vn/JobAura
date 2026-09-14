'use client'

import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, MessageSquare, ShoppingBag, Users } from 'lucide-react'
import { adminApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { Card, CardContent, PageHeader, Skeleton } from '@/shared/ui'
import { AdminResourcePage } from './admin-resource-page'

export function AdminDashboard() {
  const stats = useQuery({ queryKey: queryKeys.adminStats, queryFn: adminApi.stats })

  const metrics = [
    { label: 'Total Users', value: stats.isError ? '—' : stats.data?.content?.users ?? 0, loading: stats.isPending, icon: Users },
    { label: 'Active Jobs', value: stats.isError ? '—' : stats.data?.content?.jobs ?? 0, loading: stats.isPending, icon: BriefcaseBusiness },
    { label: 'Total Hires', value: stats.isError ? '—' : stats.data?.content?.hires ?? 0, loading: stats.isPending, icon: ShoppingBag },
    { label: 'Comments', value: stats.isError ? '—' : stats.data?.content?.comments ?? 0, loading: stats.isPending, icon: MessageSquare },
  ]

  return (
    <div>
      <PageHeader
        className="mb-6"
        title="Admin workbench"
        description="Monitor marketplace activity and manage JobAura records."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {metrics.map(({ label, value, loading, icon: Icon }) => (
          <Card key={label}>
            <CardContent>
              <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              {loading ? <Skeleton className="mb-2 h-9 w-16" /> : <p className="font-display text-3xl font-bold">{value}</p>}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {stats.isError ? (
        <div className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
          Dashboard totals are unavailable. The resource tables can still be managed below.
        </div>
      ) : null}
      <AdminResourcePage resource="jobs" embedded />
    </div>
  )
}
