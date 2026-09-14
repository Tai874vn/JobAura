'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bookmark, BriefcaseBusiness, ClipboardCheck, FileText, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { connectionsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { UserProfile } from '@/shared/schemas'
import { Card } from '@/shared/ui'
import { FeedAvatar } from './feed-avatar'
import { selectFeedCover } from './feed-cover'
import { getProfileCompleteness } from './feed-data'

export function LeftFeedRail({ user }: { user: UserProfile }) {
  const requestsQuery = useQuery({ queryKey: queryKeys.connectionRequests, queryFn: connectionsApi.requests, staleTime: 30_000 })
  const pending = requestsQuery.data?.content?.incomingCount ?? 0
  const completeness = getProfileCompleteness(user)
  const coverSource = selectFeedCover(user)
  const coverUrl = resolveAssetUrl(coverSource)

  return (
    <aside className="sticky top-20 hidden h-fit lg:block">
      <Card className="overflow-hidden">
        <div className="relative h-20 overflow-hidden bg-gradient-to-br from-primary to-primary-bright">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              loading="eager"
              unoptimized={shouldBypassImageOptimizer(coverSource)}
              className="object-cover"
              sizes="240px"
            />
          ) : null}
        </div>
        <div className="px-4 pb-4">
          <div className="-mt-6"><FeedAvatar user={user} size="lg" /></div>
          <Link href={`/profile/${user.id}`} className="mt-2 block truncate font-display text-base font-bold hover:text-primary">{user.name}</Link>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{user.headline || 'JobAura member'}</p>
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
              <span>Profile strength</span>
              <span className="text-primary">{completeness}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-bright transition-[width]"
                style={{ width: `${completeness}%` }}
                role="progressbar"
                aria-label="Profile strength"
                aria-valuenow={completeness}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            {completeness < 100 ? (
              <Link href="/settings" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                Complete your profile <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        </div>
        <nav className="border-t border-border p-2" aria-label="Personal shortcuts">
          <UtilityLink href="/saved" icon={<Bookmark className="h-4 w-4" />} label="Saved" />
          <UtilityLink href="/connections" icon={<Users className="h-4 w-4" />} label="Connections" badge={pending} />
          <UtilityLink href="/hiring-posts" icon={<BriefcaseBusiness className="h-4 w-4" />} label="Hiring posts" />
          <UtilityLink href="/my-posts" icon={<FileText className="h-4 w-4" />} label="My posts" />
          <UtilityLink href="/my-jobs" icon={<ClipboardCheck className="h-4 w-4" />} label="My jobs" />
        </nav>
      </Card>
    </aside>
  )
}

function UtilityLink({ href, icon, label, badge = 0 }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  return <Link href={href} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold hover:bg-surface-muted hover:text-primary">{icon}<span className="min-w-0 flex-1 truncate">{label}</span>{badge ? <span className="flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}</Link>
}
