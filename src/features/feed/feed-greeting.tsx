'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Sparkles, Users } from 'lucide-react'
import { connectionsApi, recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { UserProfile } from '@/shared/schemas'
import { useProfileStrength } from '@/features/users/profile-strength'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function FeedGreeting({ user }: { user: UserProfile }) {
  // Rendered per load; suppressHydrationWarning covers the server/client hour difference.
  const greeting = greetingForHour(new Date().getHours())
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
    { icon: Sparkles, label: 'Profile strength', value: `${completeness}%`, href: '/settings' },
    { icon: Users, label: 'Connections', value: String(connectionsQuery.data?.content?.totalRow ?? 0), href: '/connections' },
    {
      icon: Sparkles,
      label: 'AI runs left today',
      value: quotaQuery.data ? `${quotaQuery.data.content?.remaining ?? 0}/${quotaQuery.data.content?.limit ?? 0}` : '—',
      href: '/recommendations/jobs',
    },
  ]

  return (
    <section className="relative isolate flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-accent/15" />
      <div>
        <h1 className="font-display text-xl font-bold" suppressHydrationWarning>
          {greeting}, {user.name.split(' ')[0]} 👋
        </h1>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-2 transition hover:border-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <stat.icon className="h-4 w-4" />
            </span>
            <span>
              <b className="block text-[15px] leading-tight">{stat.value}</b>
              <span className="text-[11px] font-semibold text-muted">{stat.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
