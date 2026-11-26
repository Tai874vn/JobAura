'use client'


import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bookmark, BriefcaseBusiness, FileText, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { connectionsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { UserProfile } from '@/shared/schemas'
import { Card } from '@/shared/ui'
import { FeedAvatar } from './feed-avatar'
import { useProfileStrength } from '@/features/users/utils/profile-strength'

export function LeftFeedRail({ user }: { user: UserProfile }) {
  // Data: connectionsApi.requests → GET /api/connections/requests → NestjsBE/src/modules/connections/services/connections.service.ts getRequests()
  const requestsQuery = useQuery({ queryKey: queryKeys.connectionRequests(user.id), queryFn: connectionsApi.requests, staleTime: 30_000 })
  const pending = requestsQuery.data?.content?.incomingCount ?? 0
  const strength = useProfileStrength(user)
  const completeness = strength.score
  const next = strength.missing[0]
  const coverSource = selectFeedCover(user)
  const coverUrl = resolveAssetUrl(coverSource)

  return (
    <aside className="sticky top-20 hidden h-fit lg:block">
      <Card className="overflow-hidden">
        <div className="relative h-20 overflow-hidden bg-surface-muted">
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
          <Link href={`/profile/${user.id}`} className="mt-2 block truncate font-display text-base font-medium hover:text-primary">{user.name}</Link>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{user.headline || 'JobAura member'}</p>
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Profile strength</span>
              <span className="font-mono tabular-nums text-foreground">{completeness}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${completeness}%` }}
                role="progressbar"
                aria-label="Profile strength"
                aria-valuenow={completeness}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            {next ? (
              <Link href={next.href} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-strong">
                {next.hint} <ArrowRight className="h-3 w-3 shrink-0" />
              </Link>
            ) : null}
            {strength.missing.length > 1 ? (
              <Link href="/settings" className="mt-1 block text-xs text-muted hover:text-primary">
                {strength.missing.length - 1} more to complete
              </Link>
            ) : null}
          </div>
        </div>
        <nav className="border-t border-border p-2" aria-label="Personal shortcuts">
          <UtilityLink href="/hiring-posts" icon={<BriefcaseBusiness className="h-4 w-4" />} label="Hiring posts" />
          <UtilityLink href="/my-posts" icon={<FileText className="h-4 w-4" />} label="My portfolio posts" />
          <UtilityLink href="/saved" icon={<Bookmark className="h-4 w-4" />} label="Saved" />
          <UtilityLink href="/connections" icon={<Users className="h-4 w-4" />} label="Connections" badge={pending} />
        </nav>
      </Card>
    </aside>
  )
}

function UtilityLink({ href, icon, label, badge = 0 }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  return <Link href={href} className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground">{icon}<span className="min-w-0 flex-1 truncate">{label}</span>{badge ? <span className="font-mono text-xs tabular-nums text-primary">{badge}</span> : null}</Link>
}

type CoverSource = {
  coverImage?: string | null
  cover?: string | null
}

export function selectFeedCover(source: CoverSource) {
  return source.coverImage?.trim() || source.cover?.trim() || null
}
