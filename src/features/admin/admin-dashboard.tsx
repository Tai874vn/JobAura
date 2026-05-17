'use client'

import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, MessageSquare, ShoppingBag, Users } from 'lucide-react'
import { commentsApi, hiredJobsApi, jobsApi, usersApi } from '@/shared/api/endpoints'
import { Card, CardContent, Skeleton } from '@/shared/ui'
import { AdminResourcePage } from './admin-resource-page'

export function AdminDashboard() {
  const jobs = useQuery({ queryKey: ['admin', 'jobs', 'count'], queryFn: jobsApi.all })
  const users = useQuery({ queryKey: ['admin', 'users', 'count'], queryFn: usersApi.all })
  const hires = useQuery({ queryKey: ['admin', 'hires', 'count'], queryFn: hiredJobsApi.all })
  const comments = useQuery({ queryKey: ['admin', 'comments', 'count'], queryFn: commentsApi.all })

  const metrics = [
    { label: 'Total Users', value: users.data?.content?.length ?? 0, loading: users.isPending, icon: Users },
    { label: 'Active Jobs', value: jobs.data?.content?.length ?? 0, loading: jobs.isPending, icon: BriefcaseBusiness },
    { label: 'Total Hires', value: hires.data?.content?.length ?? 0, loading: hires.isPending, icon: ShoppingBag },
    { label: 'Comments', value: comments.data?.content?.length ?? 0, loading: comments.isPending, icon: MessageSquare },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-4xl font-bold">Admin workbench</h1>
        <p className="text-sm text-muted">Monitor marketplace activity and manage JobAura records.</p>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {metrics.map(({ label, value, loading, icon: Icon }) => (
          <Card key={label}>
            <CardContent>
              <Icon className="mb-5 h-5 w-5 text-primary" />
              {loading ? <Skeleton className="mb-2 h-9 w-16" /> : <p className="font-display text-3xl font-bold">{value}</p>}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <AdminResourcePage resource="jobs" embedded />
    </div>
  )
}
