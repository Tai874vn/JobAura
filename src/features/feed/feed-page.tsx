'use client'

import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { postsApi, savedItemsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { FeedPage, FeedPost } from '@/shared/schemas'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button, Card, Skeleton } from '@/shared/ui'
import {
  addCommentToPost,
  appendCommentToPages,
  mergeFeedPages,
  removeCommentFromPages,
  removeCommentFromPost,
  togglePostLike,
  togglePostSaved,
  updateCommentInPages,
  updateCommentInPost,
  type CommentCache,
} from './feed-data'
import { FeedPostCard } from './feed-post-card'
import { LeftFeedRail, RightFeedRail } from './feed-rails'
import { PostComposer } from './post-composer'
import { PostDiscussionModal } from './post-discussion-modal'

type FeedCache = InfiniteData<FeedPage, string | null>

export function FeedPage() {
  const user = useAuthStore((state) => state.user)!
  const queryClient = useQueryClient()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const closeDiscussion = useCallback(() => setSelectedPostId(null), [])

  const feedQuery = useInfiniteQuery({
    queryKey: queryKeys.feed,
    queryFn: async ({ pageParam }) => (await postsApi.feed({ cursor: pageParam ?? undefined, limit: 10 })).content ?? { data: [], nextCursor: null },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feedQuery

  const createMutation = useMutation({
    mutationFn: ({ content, image }: { content: string; image?: File }) => postsApi.create(content, image),
    onSuccess: (response) => {
      if (!response.content) return
      queryClient.setQueryData<FeedCache>(queryKeys.feed, (current) => prependPost(current, response.content!))
      queryClient.invalidateQueries({ queryKey: queryKeys.feedStats })
      toast.success('Post published')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not publish this post')),
  })

  const likeMutation = useMutation({
    mutationFn: ({ id, liked }: { id: number; liked: boolean }) => liked ? postsApi.like(id) : postsApi.unlike(id),
    onMutate: async ({ id, liked }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed })
      const previous = queryClient.getQueryData<FeedCache>(queryKeys.feed)
      queryClient.setQueryData<FeedCache>(queryKeys.feed, (current) => mapPost(current, id, (post) => togglePostLike(post, liked)))
      return { previous }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.feed, context?.previous)
      toast.error(getErrorMessage(error, 'Could not update like'))
    },
  })

  const commentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: number; content: string }) => postsApi.createComment(postId, content),
    onSuccess: (response, variables) => {
      if (!response.content) return
      const createdComment = response.content
      queryClient.setQueryData<FeedCache>(queryKeys.feed, (current) =>
        mapPost(current, variables.postId, (post) => addCommentToPost(post, createdComment)))
      queryClient.setQueryData<CommentCache>(queryKeys.postComments(variables.postId), (current) =>
        appendCommentToPages(current, createdComment))
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add comment')),
  })

  const editCommentMutation = useMutation({
    mutationFn: ({ postId, commentId, content }: { postId: number; commentId: number; content: string }) =>
      postsApi.updateComment(postId, commentId, content),
    onSuccess: (response, variables) => {
      if (!response.content) return
      const updatedComment = response.content
      queryClient.setQueryData<FeedCache>(queryKeys.feed, (current) =>
        mapPost(current, variables.postId, (post) => updateCommentInPost(post, updatedComment)))
      queryClient.setQueryData<CommentCache>(queryKeys.postComments(variables.postId), (current) =>
        updateCommentInPages(current, updatedComment))
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not edit comment')),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: ({ postId, commentId }: { postId: number; commentId: number }) =>
      postsApi.deleteComment(postId, commentId),
    onSuccess: (_response, variables) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed, (current) =>
        mapPost(current, variables.postId, (post) => removeCommentFromPost(post, variables.commentId)))
      queryClient.setQueryData<CommentCache>(queryKeys.postComments(variables.postId), (current) =>
        removeCommentFromPages(current, variables.commentId))
      toast.success('Comment deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete comment')),
  })

  const saveMutation = useMutation({
    mutationFn: ({ id, saved }: { id: number; saved: boolean }) =>
      saved ? savedItemsApi.savePost(id) : savedItemsApi.unsavePost(id),
    onMutate: async ({ id, saved }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed })
      const previous = queryClient.getQueryData<FeedCache>(queryKeys.feed)
      queryClient.setQueryData<FeedCache>(queryKeys.feed, (current) =>
        mapPost(current, id, (post) => togglePostSaved(post, saved)))
      return { previous }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.feed, context?.previous)
      toast.error(getErrorMessage(error, 'Could not update saved posts'))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedPosts }),
  })

  const deleteMutation = useMutation({
    mutationFn: postsApi.delete,
    onSuccess: (_response, postId) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed, (current) => removePost(current, postId))
      queryClient.invalidateQueries({ queryKey: queryKeys.feedStats })
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

  const posts = mergeFeedPages(feedQuery.data?.pages)
  const selectedPost = posts.find((post) => post.id === selectedPostId) ?? null

  return (
    <div className="container-page py-5">
      <div className="grid w-full items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <LeftFeedRail user={user} />
        <main className="min-w-0 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <MobileTab href="/saved" label="Saved" />
            <MobileTab href="/connections" label="Connections" />
            <MobileTab href="/my-posts" label="My posts" />
          </div>
          <PostComposer
            user={user}
            submitting={createMutation.isPending}
            onSubmit={async (content, image) => { await createMutation.mutateAsync({ content, image }) }}
          />

          {feedQuery.isPending ? <FeedSkeleton /> : null}
          {feedQuery.isError ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted">The feed could not be loaded.</p>
              <Button className="mt-4" variant="secondary" onClick={() => feedQuery.refetch()}>
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            </Card>
          ) : null}
          {!feedQuery.isPending && !feedQuery.isError && !posts.length ? (
            <Card className="p-10 text-center">
              <h1 className="font-display text-xl font-bold">Start the conversation</h1>
              <p className="mt-2 text-sm text-muted">Share your work, an update, or something useful to the JobAura community.</p>
            </Card>
          ) : null}
          {posts.map((post, index) => (
            <FeedPostCard
              key={post.id}
              post={post}
              index={index}
              currentUserId={user.id}
              liking={likeMutation.isPending && likeMutation.variables?.id === post.id}
              saving={saveMutation.isPending && saveMutation.variables?.id === post.id}
              onLike={(item) => likeMutation.mutate({ id: item.id, liked: !item.viewerHasLiked })}
              onOpenComments={(item) => setSelectedPostId(item.id)}
              onDelete={(postId) => deleteMutation.mutate(postId)}
              onSave={(item) => saveMutation.mutate({ id: item.id, saved: !item.viewerHasSaved })}
            />
          ))}
          <div ref={sentinelRef} className="flex h-16 items-center justify-center" aria-hidden="true">
            {feedQuery.isFetchingNextPage ? <RefreshCw className="h-5 w-5 animate-spin text-primary" /> : null}
          </div>
        </main>
        <RightFeedRail />
      </div>
      {selectedPost ? (
        <PostDiscussionModal
          post={selectedPost}
          open
          currentUserId={user.id}
          currentUserRole={user.role}
          submitting={commentMutation.isPending && commentMutation.variables?.postId === selectedPost.id}
          editingCommentId={editCommentMutation.isPending ? editCommentMutation.variables?.commentId : undefined}
          deletingCommentId={deleteCommentMutation.isPending ? deleteCommentMutation.variables?.commentId : undefined}
          onClose={closeDiscussion}
          onSubmit={async (postId, content) => { await commentMutation.mutateAsync({ postId, content }) }}
          onEdit={async (postId, commentId, content) => {
            await editCommentMutation.mutateAsync({ postId, commentId, content })
          }}
          onDelete={async (postId, commentId) => {
            await deleteCommentMutation.mutateAsync({ postId, commentId })
          }}
        />
      ) : null}
    </div>
  )
}

function MobileTab({ href, label }: { href: string; label: string }) {
  return <a href={href} className="shrink-0 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold">{label}</a>
}

function FeedSkeleton() {
  return <div className="space-y-4">{[1, 2].map((item) => <Card key={item} className="space-y-4 p-4"><div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></div><Skeleton className="h-4 w-full" /><Skeleton className="h-64 w-full" /></Card>)}</div>
}

function mapPost(cache: FeedCache | undefined, postId: number, mapper: (post: FeedPost) => FeedPost) {
  if (!cache) return cache
  return { ...cache, pages: cache.pages.map((page) => ({ ...page, data: page.data.map((post) => post.id === postId ? mapper(post) : post) })) }
}

function prependPost(cache: FeedCache | undefined, post: FeedPost): FeedCache {
  if (!cache?.pages.length) return { pages: [{ data: [post], nextCursor: null }], pageParams: [null] }
  return { ...cache, pages: [{ ...cache.pages[0], data: [post, ...cache.pages[0].data] }, ...cache.pages.slice(1)] }
}

function removePost(cache: FeedCache | undefined, postId: number) {
  if (!cache) return cache
  return { ...cache, pages: cache.pages.map((page) => ({ ...page, data: page.data.filter((post) => post.id !== postId) })) }
}
