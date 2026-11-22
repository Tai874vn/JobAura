'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { connectionsApi, recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { UserProfile } from '@/shared/schemas'
import { useProfileStrength } from '@/features/users/profile-strength'

export function FeedGreeting({ user }: { user: UserProfile }) {
  const completeness = useProfileStrength(user).score

  const connectionsQuery = useQuery({
    queryKey: queryKeys.connections({ page: 1, pageSize: 1 }),
    queryFn: () => connectionsApi.all({ page: 1, pageSize: 1 }),
    staleTime: 60_000,
  })
  const quotaQuery = useQuery({
    queryKey: queryKeys.recommendationQuota,
    queryFn: recommendationsApi.quota,
    staleTime: 30_000,
    retry: false,
  })

  const stats = [
    { label: 'Profile strength', value: `${completeness}%`, href: '/settings' },
    { label: 'Connections', value: String(connectionsQuery.data?.content?.totalRow ?? 0), href: '/connections' },
    {
      label: 'Matching runs left today',
      value: quotaQuery.data ? `${quotaQuery.data.content?.remaining ?? 0}/${quotaQuery.data.content?.limit ?? 0}` : '—',
      href: '/recommendations/jobs',
    },
  ]

  return (
    <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-medium">Your feed</h1>
        <p className="mt-1 truncate text-sm text-muted">{user.name}</p>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-xs text-muted">{stat.label}</dt>
            <dd className="mt-1">
              <Link
                href={stat.href}
                className="font-mono text-base font-medium tabular-nums transition-colors hover:text-primary"
              >
                {stat.value}
              </Link>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
