'use client'

import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { Card, CardContent, PageHeader, Skeleton } from '@/shared/ui'
import { AdminResourcePage } from './admin-resource-page'

export function AdminDashboard() {
  const stats = useQuery({ queryKey: queryKeys.adminStats, queryFn: adminApi.stats })

  const metrics = [
    { label: 'Users', value: stats.isError ? '—' : stats.data?.content?.users ?? 0, loading: stats.isPending },
    { label: 'Active jobs', value: stats.isError ? '—' : stats.data?.content?.jobs ?? 0, loading: stats.isPending },
    { label: 'Contracts', value: stats.isError ? '—' : stats.data?.content?.contracts ?? 0, loading: stats.isPending },
    { label: 'Comments', value: stats.isError ? '—' : stats.data?.content?.comments ?? 0, loading: stats.isPending },
  ]

  return (
    <div>
      <PageHeader
        className="mb-6"
        title="Admin workbench"
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {metrics.map(({ label, value, loading }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted">{label}</p>
              {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 font-display text-3xl font-medium tabular-nums">{value}</p>}
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
