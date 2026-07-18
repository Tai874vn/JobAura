'use client'

import { useQuery } from '@tanstack/react-query'
import { Bookmark, BriefcaseBusiness, FileText, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { connectionsApi, hiringPostsApi, skillsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { UserProfile } from '@/shared/schemas'
import { Card } from '@/shared/ui'
import { FeedAvatar } from './feed-avatar'
import { selectFeedCover } from './feed-cover'

export function LeftFeedRail({ user }: { user: UserProfile }) {
  const requestsQuery = useQuery({ queryKey: queryKeys.connectionRequests, queryFn: connectionsApi.requests, staleTime: 30_000 })
  const pending = requestsQuery.data?.content?.incomingCount ?? 0
  const coverSource = selectFeedCover(user)
  const coverUrl = resolveAssetUrl(coverSource)
  return (
    <aside className="sticky top-20 hidden h-fit lg:block">
      <Card className="overflow-hidden">
        <div className="relative h-20 overflow-hidden bg-primary">
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
        </div>
        <nav className="border-t border-border p-2" aria-label="Personal shortcuts">
          <UtilityLink href="/saved" icon={<Bookmark className="h-4 w-4" />} label="Saved" />
          <UtilityLink href="/connections" icon={<Users className="h-4 w-4" />} label="Connections" badge={pending} />
          <UtilityLink href="/hiring-posts" icon={<BriefcaseBusiness className="h-4 w-4" />} label="Hiring posts" />
          <UtilityLink href="/my-posts" icon={<FileText className="h-4 w-4" />} label="My posts" />
          <UtilityLink href="/my-jobs" icon={<BriefcaseBusiness className="h-4 w-4" />} label="My jobs" />
        </nav>
      </Card>
    </aside>
  )
}

export function RightFeedRail() {
  const skillsQuery = useQuery({ queryKey: ['skills', 'feed'], queryFn: skillsApi.all, staleTime: 300_000 })
  const jobsQuery = useQuery({ queryKey: queryKeys.hiringPosts({ feedRail: true }), queryFn: () => hiringPostsApi.open({ page: 1, pageSize: 4 }), staleTime: 120_000 })
  const skills = skillsQuery.data?.content?.slice(0, 8) ?? []
  const jobs = jobsQuery.data?.content?.data.slice(0, 4) ?? []
  return <aside className="sticky top-20 hidden h-fit space-y-4 xl:block"><Card className="p-4"><h2 className="text-sm font-bold">Skills people are hiring for</h2><div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <Link key={skill} href={`/hiring-posts?keyword=${encodeURIComponent(skill)}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary">{skill}</Link>)}</div></Card><Card className="p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">Fresh hiring posts</h2><Link href="/hiring-posts" className="text-xs font-bold text-primary">View all</Link></div><div className="mt-2 divide-y divide-border">{jobs.map((job) => <Link key={job.id} href="/hiring-posts" className="block py-3 hover:text-primary"><p className="line-clamp-2 text-sm font-semibold">{job.title}</p><p className="mt-1 truncate text-xs text-muted">{job.location || job.employmentType || 'New role'}</p></Link>)}</div></Card></aside>
}

function UtilityLink({ href, icon, label, badge = 0 }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  return <Link href={href} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold hover:bg-surface-muted hover:text-primary">{icon}<span className="min-w-0 flex-1 truncate">{label}</span>{badge ? <span className="flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}</Link>
}
