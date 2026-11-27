'use client'

/**
 * Main home feed page (/) for signed-in users.
 * Displays the side rails, greeting, recommended jobs, post composer, an infinite-scroll post list with like/save/delete actions, and the discussion modal.
 *
 * Calls: GET /api/posts/feed; POST /api/posts; PUT /api/posts/:id/like; DELETE /api/posts/:id/like; PUT /api/saved/posts/:postId; DELETE /api/saved/posts/:postId; DELETE /api/posts/:id; useSession; LeftFeedRail; FeedGreeting; JobsForYou; PostComposer; FeedPostCard; RightFeedRail; PostDiscussionModal
 * Used by:
 *   - app/(feed)/page.tsx
 *   - features/feed/components/role-home-page.tsx
 */

import { feedConfig } from '@/features/feed/config/feed'

import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, mutationOptions, type QueryClient } from '@tanstack/react-query'
import { MessagesSquare, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/hooks/use-session'
import { postsApi, savedItemsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { FeedPage, FeedPost } from '@/shared/schemas'
import { Button, Card, ConfirmationDialog, EmptyState, Skeleton } from '@/shared/ui'
import { mergeFeedPages, togglePostLike, togglePostSaved } from '../utils/feed-data'
import { FeedGreeting } from './feed-greeting'
import { LeftFeedRail } from './feed-left-rail'
import { JobsForYou } from './jobs-for-you'
import { FeedPostCard } from './feed-post-card'
import { RightFeedRail } from './feed-rails'
import { PostComposer } from './post-composer'
import { PostDiscussionModal } from './post-discussion-modal'

type FeedCache = InfiniteData<FeedPage, string | null>

/**
 * Home feed (/). Posts load feedConfig.postsPerLoad at a time; reaching the bottom (IntersectionObserver on
 * sentinelRef) loads the next page. A new post is put at the top of the list without a reload. Like and save
 * change the card at once and go back if the server refuses. Clicking a post opens the discussion modal
 * (selectedPostId); delete asks first (pendingDeletePostId).
 */
export function FeedPage() {
  const { user: sessionUser } = useSession()
  const user = sessionUser!
  const queryClient = useQueryClient()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [pendingDeletePostId, setPendingDeletePostId] = useState<number | null>(null)
  const closeDiscussion = useCallback(() => setSelectedPostId(null), [])

  // Data: postsApi.feed → GET /api/posts/feed → NestjsBE/src/modules/posts/services/posts.service.ts getFeed()
  const feedQuery = useInfiniteQuery({
    queryKey: queryKeys.feed(user.id),
    queryFn: async ({ pageParam }) => (await postsApi.feed({ cursor: pageParam ?? undefined, limit: feedConfig.postsPerLoad })).content ?? { data: [], nextCursor: null },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feedQuery

  // Data: postsApi.create → POST /api/posts → NestjsBE/src/modules/posts/services/posts.service.ts createPost()
  const createMutation = useMutation({
    mutationFn: ({ content, image }: { content: string; image?: File }) => postsApi.create(content, image),
    onSuccess: (response) => {
      if (!response.content) return
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user.id), (current) => prependPost(current, response.content!))
      queryClient.invalidateQueries({ queryKey: queryKeys.feedStats(user.id) })
      toast.success('Post published')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not publish this post')),
  })

  // Data: postLikeOptions() → postsApi.like → PUT /api/posts/:id/like → NestjsBE/src/modules/posts/services/posts.service.ts likePost()
  // Data: postLikeOptions() → postsApi.unlike → DELETE /api/posts/:id/like → NestjsBE/src/modules/posts/services/posts.service.ts unlikePost()
  const likeMutation = useMutation(postLikeOptions(queryClient, user.id))
  // Data: postSaveOptions() → savedItemsApi.savePost / unsavePost → PUT or DELETE /api/saved/posts/:postId → NestjsBE/src/modules/saved-items/services/saved-items.service.ts savePost() / unsavePost()
  const saveMutation = useMutation(postSaveOptions(queryClient, user.id))
  const { mutate: toggleLike } = likeMutation
  const { mutate: toggleSave } = saveMutation

  // Data: postsApi.delete → DELETE /api/posts/:id → NestjsBE/src/modules/posts/services/posts.service.ts deletePost()
  const deleteMutation = useMutation({
    mutationFn: postsApi.delete,
    onSuccess: (_response, postId) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user.id), (current) => removePost(current, postId))
      queryClient.invalidateQueries({ queryKey: queryKeys.feedStats(user.id) })
      setPendingDeletePostId(null)
      toast.success('Post deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete this post')),
  })

  useEffect(() => {
    const element = sentinelRef.current
    if (!element) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage()
      }
    }, { rootMargin: '320px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const posts = useMemo(() => mergeFeedPages(feedQuery.data?.pages), [feedQuery.data?.pages])
  const selectedPost = useMemo(() => posts.find((post) => post.id === selectedPostId) ?? null, [posts, selectedPostId])

  // Stable callbacks keep memoized FeedPostCard instances from re-rendering on unrelated feed state updates.
  const handleLike = useCallback((item: FeedPost) => {
    toggleLike({ id: item.id, liked: !item.viewerHasLiked })
  }, [toggleLike])
  const handleOpenComments = useCallback((item: FeedPost) => {
    setSelectedPostId(item.id)
  }, [])
  const handleDelete = useCallback((postId: number) => {
    setPendingDeletePostId(postId)
  }, [])
  const handleSave = useCallback((item: FeedPost) => {
    toggleSave({ id: item.id, saved: !item.viewerHasSaved })
  }, [toggleSave])

  return (
    <div className="container-page py-5">
      <div className="grid w-full items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <LeftFeedRail user={user} />
        <div className="min-w-0 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <MobileTab href="/hiring-posts" label="Hiring posts" />
            <MobileTab href="/my-posts" label="My portfolio" />
            <MobileTab href="/saved" label="Saved" />
            <MobileTab href="/connections" label="Connections" />
          </div>
          <FeedGreeting user={user} />
          {/* Roles to apply to come before the social feed: finding a job is why candidates are here. */}
          <JobsForYou />
          <PostComposer
            user={user}
            submitting={createMutation.isPending}
            onSubmit={async (content, image) => { await createMutation.mutateAsync({ content, image }) }}
          />

          {feedQuery.isPending ? <FeedSkeleton /> : null}
          {feedQuery.isError ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted">{getErrorMessage(feedQuery.error, 'The feed could not be loaded.')}</p>
              <Button className="mt-4" variant="secondary" onClick={() => feedQuery.refetch()}>
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            </Card>
          ) : null}
          {!feedQuery.isPending && !feedQuery.isError && !posts.length ? (
            <EmptyState
              icon={<MessagesSquare />}
              title="Start the conversation"
              description="Share your work, an update, or something useful to the JobAura community."
            />
          ) : null}
          {posts.map((post, index) => (
            <FeedPostCard
              key={post.id}
              post={post}
              index={index}
              currentUserId={user.id}
              liking={likeMutation.isPending && likeMutation.variables?.id === post.id}
              saving={saveMutation.isPending && saveMutation.variables?.id === post.id}
              onLike={handleLike}
              onOpenComments={handleOpenComments}
              onDelete={handleDelete}
              onSave={handleSave}
            />
          ))}
          <div ref={sentinelRef} className="min-h-4" aria-hidden={!feedQuery.isFetchingNextPage}>
            {feedQuery.isFetchingNextPage ? <FeedPostCardSkeleton /> : null}
          </div>
        </div>
        <RightFeedRail />
      </div>
      {selectedPost ? (
        <PostDiscussionModal
          key={selectedPost.id}
          post={selectedPost}
          open
          currentUserId={user.id}
          currentUserRole={user.role}
          onClose={closeDiscussion}
        />
      ) : null}
      <ConfirmationDialog
        open={pendingDeletePostId !== null}
        title="Delete this post?"
        description="This post and its discussion will be permanently removed. This action cannot be undone."
        confirmLabel="Delete post"
        pending={deleteMutation.isPending}
        onCancel={() => setPendingDeletePostId(null)}
        onConfirm={() => {
          if (pendingDeletePostId !== null) deleteMutation.mutate(pendingDeletePostId)
        }}
      />
    </div>
  )
}

function MobileTab({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium">{label}</Link>
}

function FeedPostCardSkeleton() {
  return (
    <Card className="space-y-4 p-4" aria-hidden="true">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-56 w-full" />
    </Card>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading feed" aria-busy="true">
      <span className="sr-only">Loading feed</span>
      <FeedPostCardSkeleton />
      <FeedPostCardSkeleton />
    </div>
  )
}

function prependPost(cache: FeedCache | undefined, post: FeedPost): FeedCache {
  if (!cache?.pages.length) return { pages: [{ data: [post], nextCursor: null }], pageParams: [null] }
  return { ...cache, pages: [{ ...cache.pages[0], data: [post, ...cache.pages[0].data] }, ...cache.pages.slice(1)] }
}

function removePost(cache: FeedCache | undefined, postId: number) {
  if (!cache) return cache
  return { ...cache, pages: cache.pages.map((page) => ({ ...page, data: page.data.filter((post) => post.id !== postId) })) }
}


export function postLikeOptions(client: QueryClient, viewerId?: number | null) {
  const feedKey = queryKeys.feed(viewerId)
  return mutationOptions({
    mutationFn: ({ id, liked }: { id: number; liked: boolean }) => liked ? postsApi.like(id) : postsApi.unlike(id),
    onMutate: async ({ id, liked }) => {
      await client.cancelQueries({ queryKey: feedKey })
      const previous = client.getQueryData<FeedCache>(feedKey)
      client.setQueryData<FeedCache>(feedKey, (cache) => mapPost(cache, id, (post) => togglePostLike(post, liked)))
      return { previous }
    },
    onError: (error, _variables, context) => {
      client.setQueryData(feedKey, context?.previous)
      toast.error(getErrorMessage(error, 'Could not update like'))
    },
    onSettled: () => client.invalidateQueries({ queryKey: feedKey }),
  })
}

export function postSaveOptions(client: QueryClient, viewerId?: number | null) {
  const feedKey = queryKeys.feed(viewerId)
  const savedKey = queryKeys.savedPosts(viewerId)
  return mutationOptions({
    mutationFn: ({ id, saved }: { id: number; saved: boolean }) =>
      saved ? savedItemsApi.savePost(id) : savedItemsApi.unsavePost(id),
    onMutate: async ({ id, saved }) => {
      await client.cancelQueries({ queryKey: feedKey })
      const previous = client.getQueryData<FeedCache>(feedKey)
      client.setQueryData<FeedCache>(feedKey, (cache) => mapPost(cache, id, (post) => togglePostSaved(post, saved)))
      return { previous }
    },
    onError: (error, _variables, context) => {
      client.setQueryData(feedKey, context?.previous)
      toast.error(getErrorMessage(error, 'Could not update saved posts'))
    },
    onSettled: () => Promise.all([
      client.invalidateQueries({ queryKey: feedKey }),
      client.invalidateQueries({ queryKey: savedKey }),
    ]),
  })
}

function mapPost(cache: FeedCache | undefined, id: number, update: (post: FeedPost) => FeedPost) {
  if (!cache) return cache
  return {
    ...cache,
    pages: cache.pages.map((page) => ({ ...page, data: page.data.map((post) => post.id === id ? update(post) : post) })),
  }
}
