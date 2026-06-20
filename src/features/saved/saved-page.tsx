'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, BriefcaseBusiness, FileText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { savedItemsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { FeedPost } from '@/shared/schemas'
import { Button, Card, Skeleton } from '@/shared/ui'
import { FeedAvatar } from '@/features/feed/feed-avatar'
import { JobCard } from '@/features/jobs/job-card'
import { mergeSavedPages } from './saved-data'

type SavedTab = 'posts' | 'jobs'

export function SavedPage() {
  const [tab, setTab] = useState<SavedTab>('posts')
  const queryClient = useQueryClient()
  const postsQuery = useInfiniteQuery({
    queryKey: queryKeys.savedPosts,
    queryFn: async ({ pageParam }) => (await savedItemsApi.posts(pageParam ?? undefined)).content ?? { data: [], nextCursor: null },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: tab === 'posts',
  })
  const jobsQuery = useInfiniteQuery({
    queryKey: queryKeys.savedJobs,
    queryFn: async ({ pageParam }) => (await savedItemsApi.jobs(pageParam ?? undefined)).content ?? { data: [], nextCursor: null },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: tab === 'jobs',
  })
  const removePost = useMutation({
    mutationFn: savedItemsApi.unsavePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedPosts })
      queryClient.invalidateQueries({ queryKey: queryKeys.feed })
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not remove saved post')),
  })
  const posts = mergeSavedPages(postsQuery.data?.pages)
  const jobs = mergeSavedPages(jobsQuery.data?.pages)

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Saved</h1>
          <p className="mt-1 text-sm text-muted">Posts and opportunities you want to return to.</p>
        </div>
        <div className="flex rounded-lg border border-border bg-white p-1">
          <TabButton active={tab === 'posts'} onClick={() => setTab('posts')} icon={<FileText className="h-4 w-4" />} label="Posts" />
          <TabButton active={tab === 'jobs'} onClick={() => setTab('jobs')} icon={<BriefcaseBusiness className="h-4 w-4" />} label="Jobs" />
        </div>
      </div>

      {tab === 'posts' ? (
        <div className="mx-auto mt-6 max-w-3xl space-y-4">
          {postsQuery.isPending ? <SavedSkeleton /> : posts.map((post) => (
            <SavedPostCard key={post.id} post={post} removing={removePost.isPending && removePost.variables === post.id} onRemove={() => removePost.mutate(post.id)} />
          ))}
          {!postsQuery.isPending && !posts.length ? <EmptySaved type="posts" /> : null}
          {postsQuery.hasNextPage ? <Button className="mx-auto flex" variant="secondary" onClick={() => postsQuery.fetchNextPage()} disabled={postsQuery.isFetchingNextPage}>Load more posts</Button> : null}
        </div>
      ) : (
        <div className="mt-6">
          {jobsQuery.isPending ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><SavedSkeleton /><SavedSkeleton /></div> : null}
          {jobs.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{jobs.map((job) => <JobCard key={job.id} job={job} initialSaved />)}</div> : null}
          {!jobsQuery.isPending && !jobs.length ? <EmptySaved type="jobs" /> : null}
          {jobsQuery.hasNextPage ? <Button className="mx-auto mt-6 flex" variant="secondary" onClick={() => jobsQuery.fetchNextPage()} disabled={jobsQuery.isFetchingNextPage}>Load more jobs</Button> : null}
        </div>
      )}
    </div>
  )
}

function SavedPostCard({ post, removing, onRemove }: { post: FeedPost; removing: boolean; onRemove: () => void }) {
  const image = resolveAssetUrl(post.imageUrl)
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <FeedAvatar user={post.author} />
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${post.author.id}`} className="text-sm font-bold hover:text-primary">{post.author.name}</Link>
          <p className="truncate text-xs text-muted">{post.author.headline || 'JobAura member'}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} disabled={removing} title="Remove saved post"><Bookmark className="h-5 w-5 fill-primary text-primary" /></Button>
      </div>
      {post.content ? <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-6">{post.content}</p> : null}
      {image ? <Image src={image} alt={`Post by ${post.author.name}`} width={960} height={640} unoptimized={shouldBypassImageOptimizer(post.imageUrl)} className="max-h-[520px] w-full border-t border-border object-contain" /> : null}
      <div className="flex gap-4 border-t border-border px-4 py-3 text-xs text-muted"><span>{post.likeCount} likes</span><span>{post.commentCount} comments</span></div>
    </Card>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex h-9 items-center gap-2 rounded px-4 text-sm font-semibold ${active ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}>{icon}{label}</button>
}

function EmptySaved({ type }: { type: SavedTab }) {
  return <Card className="p-10 text-center"><Bookmark className="mx-auto h-6 w-6 text-primary" /><h2 className="mt-3 font-display text-lg font-bold">No saved {type}</h2><p className="mt-1 text-sm text-muted">Save something useful and it will appear here.</p><Link href={type === 'posts' ? '/' : '/jobs'} className="mt-4 inline-flex text-sm font-bold text-primary">Browse {type}</Link></Card>
}

function SavedSkeleton() {
  return <Card className="space-y-4 p-4"><div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-40" /></div><Skeleton className="h-4 w-full" /><Skeleton className="h-48 w-full" /></Card>
}
