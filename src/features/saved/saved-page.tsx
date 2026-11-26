'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, BriefcaseBusiness, ChevronDown, FileText, SearchX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { savedItemsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { FeedPost } from '@/shared/schemas'
import { Button, ButtonLink, Card, CardSkeleton, EmptyState, Skeleton } from '@/shared/ui'
import { FeedAvatar } from '@/features/feed/components/feed-avatar'
import { JobCard } from '@/features/jobs/components/browse/job-card'
import { mergeSavedPages } from './saved-data'

type SavedTab = 'posts' | 'jobs'

export function SavedPage() {
  const [tab, setTab] = useState<SavedTab>('posts')
  const queryClient = useQueryClient()
  const { user } = useSession()
  const viewerId = user?.id
  const postsQuery = useInfiniteQuery({
    queryKey: queryKeys.savedPosts(viewerId),
    queryFn: async ({ pageParam }) => (await savedItemsApi.posts(pageParam ?? undefined)).content ?? { data: [], nextCursor: null },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: tab === 'posts',
  })
  const jobsQuery = useInfiniteQuery({
    queryKey: queryKeys.savedJobs(viewerId),
    queryFn: async ({ pageParam }) => (await savedItemsApi.jobs(pageParam ?? undefined)).content ?? { data: [], nextCursor: null },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: tab === 'jobs',
  })
  const removePost = useMutation({
    mutationFn: savedItemsApi.unsavePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedPosts(viewerId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.feed(viewerId) })
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not remove saved post')),
  })
  const posts = mergeSavedPages(postsQuery.data?.pages)
  const jobs = mergeSavedPages(jobsQuery.data?.pages)
  const postsLoadFailed = postsQuery.isError && !postsQuery.data
  const jobsLoadFailed = jobsQuery.isError && !jobsQuery.data

  return (
    <div className="container-page pt-10 pb-16">
      <h1 className="font-display text-3xl font-medium tracking-tight">Saved</h1>

      <div className="mt-5 flex gap-2" role="tablist" aria-label="Saved items">
        <TabChip
          active={tab === 'posts'}
          onClick={() => setTab('posts')}
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Posts"
          count={tab === 'posts' ? posts.length : undefined}
        />
        <TabChip
          active={tab === 'jobs'}
          onClick={() => setTab('jobs')}
          icon={<BriefcaseBusiness className="h-3.5 w-3.5" />}
          label="Jobs"
          count={tab === 'jobs' ? jobs.length : undefined}
        />
      </div>

      {tab === 'posts' ? (
        <section className="mx-auto mt-5 max-w-3xl space-y-4" aria-busy={postsQuery.isPending} aria-live="polite">
          {postsQuery.isPending ? (
            <>
              <SavedSkeleton />
              <SavedSkeleton />
            </>
          ) : (
            <div className="results-in space-y-4">
              {posts.map((post) => (
                <SavedPostCard key={post.id} post={post} removing={removePost.isPending && removePost.variables === post.id} onRemove={() => removePost.mutate(post.id)} />
              ))}
              {postsLoadFailed ? (
                <EmptyState
                  className="mt-5"
                  icon={<SearchX />}
                  title="Saved posts could not be loaded"
                  description={getErrorMessage(postsQuery.error, 'Could not load your saved posts. Please try again.')}
                  action={<Button variant="secondary" onClick={() => postsQuery.refetch()}>Retry</Button>}
                />
              ) : null}
              {!postsLoadFailed && !posts.length ? (
                <EmptyState
                  className="mt-5"
                  icon={<Bookmark />}
                  title="No saved posts yet"
                  description="Save posts from your home feed and they will appear here."
                  action={<ButtonLink href="/">Browse the feed</ButtonLink>}
                />
              ) : null}
              {posts.length ? (
                <p className="mt-4 text-center text-xs font-medium text-muted">Saved from your home feed — tap the bookmark on any post to remove it.</p>
              ) : null}
              {postsQuery.hasNextPage ? (
                <Button className="mx-auto mt-2 flex" variant="secondary" onClick={() => postsQuery.fetchNextPage()} loading={postsQuery.isFetchingNextPage}>
                  <ChevronDown className="h-4 w-4" />
                  Load more posts
                </Button>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'jobs' ? (
        <section className="mt-5" aria-busy={jobsQuery.isPending} aria-live="polite">
          {jobsQuery.isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="results-in">
              {jobs.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{jobs.map((job) => <JobCard key={job.id} job={job} initialSaved />)}</div>
              ) : null}
              {jobsLoadFailed ? (
                <EmptyState
                  icon={<SearchX />}
                  title="Saved jobs could not be loaded"
                  description={getErrorMessage(jobsQuery.error, 'Could not load your saved jobs. Please try again.')}
                  action={<Button variant="secondary" onClick={() => jobsQuery.refetch()}>Retry</Button>}
                />
              ) : null}
              {!jobsLoadFailed && !jobs.length ? (
                <EmptyState
                  icon={<Bookmark />}
                  title="No saved jobs yet"
                  description="Tap the bookmark on any service in Explore and it will be waiting for you here."
                  action={<ButtonLink href="/jobs">Browse portfolios</ButtonLink>}
                />
              ) : null}
              {jobs.length ? (
                <p className="mt-4 text-center text-xs font-medium text-muted">Saved from Explore — the bookmark on each card removes it.</p>
              ) : null}
              {jobsQuery.hasNextPage ? (
                <Button className="mx-auto mt-2 flex" variant="secondary" onClick={() => jobsQuery.fetchNextPage()} loading={jobsQuery.isFetchingNextPage}>
                  <ChevronDown className="h-4 w-4" />
                  Load more jobs
                </Button>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}

function TabChip({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition',
        active ? 'border-foreground bg-foreground text-white' : 'border-border bg-surface text-muted hover:border-primary hover:text-primary'
      )}
    >
      <span className={active ? 'text-accent' : 'text-primary'}>{icon}</span>
      {label}
      {count !== undefined ? <span className={cn('text-xs font-medium', active ? 'text-accent' : 'text-muted')}>{count}</span> : null}
    </button>
  )
}

function SavedPostCard({ post, removing, onRemove }: { post: FeedPost; removing: boolean; onRemove: () => void }) {
  const image = resolveAssetUrl(post.imageUrl)
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <FeedAvatar user={post.author} />
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${post.author.id}`} className="text-sm font-medium hover:text-primary">{post.author.name}</Link>
          <p className="truncate text-xs text-muted">{post.author.headline || 'JobAura member'}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          title="Remove saved post"
          aria-label="Remove saved post"
          className="grid h-9 w-9 place-items-center rounded-lg text-primary transition hover:bg-danger/5 hover:text-danger disabled:opacity-50"
        >
          <Bookmark className={cn('h-5 w-5', !removing && 'fill-primary')} />
        </button>
      </div>
      {post.content ? <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-6">{post.content}</p> : null}
      {image ? <Image src={image} alt={`Post by ${post.author.name}`} width={960} height={640} unoptimized={shouldBypassImageOptimizer(post.imageUrl)} className="max-h-[520px] w-full border-t border-border object-contain" /> : null}
      <div className="flex gap-4 border-t border-border px-4 py-3 text-xs text-muted"><span>{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</span><span>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</span></div>
    </Card>
  )
}

function SavedSkeleton() {
  return <Card className="space-y-4 p-4"><div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-40" /></div><Skeleton className="h-4 w-full" /><Skeleton className="h-48 w-full" /></Card>
}
