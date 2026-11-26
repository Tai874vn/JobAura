'use client'


import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Send, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { postsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { prefersReducedMotion } from '@/shared/lib/motion'
import { getErrorMessage, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { FeedPost, PostComment, ApiResponse } from '@/shared/schemas'
import { Button, DialogPortal, Skeleton, useDialogFocus } from '@/shared/ui'
import { CommentThread } from './comment-thread'
import { mergeComments } from '../utils/feed-data'
import { FeedAvatar } from './feed-avatar'
import { timeAgo } from '../utils/time-ago'
import { toast } from 'sonner'
import { syncDiscussionChange } from '@/features/feed/utils/discussion-cache'

export type DiscussionScrollStage = 'idle' | 'preview' | 'settled'

export type DiscussionScrollDecision = {
  shouldScroll: boolean
  behavior: 'auto' | 'smooth'
  nextStage: DiscussionScrollStage
  clearPendingOwnComment: boolean
}

/**
 * Decides whether PostDiscussionModal should scroll to the newest comment.
 * Scrolls on initial preview, again when the first fetched page arrives (even if preview
 * comments already scrolled), and when the user submits their own comment — never when
 * "View earlier comments" prepends additional pages after the first page has settled.
 */
export function decideDiscussionScroll({
  open,
  commentCount,
  hasLoadedFirstPage,
  stage,
  pendingOwnComment,
  prefersReducedMotion,
}: {
  open: boolean
  commentCount: number
  hasLoadedFirstPage: boolean
  stage: DiscussionScrollStage
  pendingOwnComment: boolean
  prefersReducedMotion: boolean
}): DiscussionScrollDecision {
  if (!open) {
    return { shouldScroll: false, behavior: 'auto', nextStage: 'idle', clearPendingOwnComment: false }
  }

  if (commentCount === 0) {
    return {
      shouldScroll: false,
      behavior: 'auto',
      nextStage: hasLoadedFirstPage ? 'settled' : stage,
      clearPendingOwnComment: false,
    }
  }

  if (pendingOwnComment) {
    return {
      shouldScroll: true,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      nextStage: hasLoadedFirstPage ? 'settled' : 'preview',
      clearPendingOwnComment: true,
    }
  }

  if (stage === 'settled') {
    return { shouldScroll: false, behavior: 'auto', nextStage: 'settled', clearPendingOwnComment: false }
  }

  if (hasLoadedFirstPage) {
    return { shouldScroll: true, behavior: 'auto', nextStage: 'settled', clearPendingOwnComment: false }
  }

  if (stage === 'idle') {
    return { shouldScroll: true, behavior: 'auto', nextStage: 'preview', clearPendingOwnComment: false }
  }

  return { shouldScroll: false, behavior: 'auto', nextStage: 'preview', clearPendingOwnComment: false }
}

export function PostDiscussionModal({
  post,
  open,
  currentUserId,
  currentUserRole,
  onClose,
}: {
  post: FeedPost
  open: boolean
  currentUserId: number
  currentUserRole?: string | null
  onClose: () => void
}) {
  const [comment, setComment] = useState('')
  const { createComment, createReply, editComment, deleteComment } = useDiscussionMutations(post.id, currentUserId)
  const busy = createComment.isPending || createReply.isPending || editComment.isPending || deleteComment.isPending
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollStageRef = useRef<DiscussionScrollStage>('idle')
  const pendingOwnCommentScroll = useRef(false)
  const image = resolveAssetUrl(post.imageUrl)
  const commentsQuery = useInfiniteQuery({
    queryKey: queryKeys.postComments(post.id),
    queryFn: async ({ pageParam }) =>
      (await postsApi.comments(post.id, pageParam ?? undefined, 5)).content ?? { data: [], nextCursor: null },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: open,
  })

  // Portal + dialog focus trap keeps Tab inside the modal, handles Escape only when topmost, and restores focus.
  const dialogRef = useDialogFocus(onClose, !busy)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const comments = useMemo(() => {
    const loadedGroups = commentsQuery.data?.pages.map((page) => page.data) ?? []
    return mergeComments([...loadedGroups, post.recentComments])
  }, [commentsQuery.data?.pages, post.recentComments])
  const hasLoadedFirstPage = (commentsQuery.data?.pages.length ?? 0) > 0

  useEffect(() => {
    const reduced = open && prefersReducedMotion()
    const decision = decideDiscussionScroll({
      open,
      commentCount: comments.length,
      hasLoadedFirstPage,
      stage: scrollStageRef.current,
      pendingOwnComment: pendingOwnCommentScroll.current,
      prefersReducedMotion: reduced,
    })

    if (!decision.shouldScroll) {
      scrollStageRef.current = decision.nextStage
      if (!open) pendingOwnCommentScroll.current = false
      return
    }

    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: decision.behavior,
        block: 'end',
      })
      scrollStageRef.current = decision.nextStage
      if (decision.clearPendingOwnComment) pendingOwnCommentScroll.current = false
    })
    return () => window.cancelAnimationFrame(frame)
  }, [comments.length, hasLoadedFirstPage, open])

  const { mutateAsync: replyAsync } = createReply
  const { mutateAsync: editAsync } = editComment
  const { mutateAsync: deleteAsync } = deleteComment
  const handleReply = useCallback(async (rootId: number, content: string) => {
    await replyAsync({ rootId, content })
  }, [replyAsync])
  const handleEdit = useCallback(async (target: PostComment, content: string) => {
    await editAsync({ comment: target, content })
  }, [editAsync])
  const handleDelete = useCallback(async (target: PostComment) => {
    await deleteAsync(target)
  }, [deleteAsync])

  if (!open) return null

  async function submitComment(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = comment.trim()
    if (busy || !content) return
    try {
      pendingOwnCommentScroll.current = true
      await createComment.mutateAsync(content)
      setComment((current) => current.trim() === content ? '' : current)
    } catch {
      pendingOwnCommentScroll.current = false
      // Mutation errors are presented by the feed toast and the draft stays intact.
    }
  }

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-70 flex items-center justify-center bg-black/55 p-0 sm:p-5"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) onClose()
        }}
      >
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-discussion-title"
          className="motion-panel flex h-full w-full max-w-2xl flex-col overflow-hidden bg-surface shadow-overlay sm:h-[min(900px,calc(100vh-40px))] sm:rounded-lg"
        >
        <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-border px-14">
          <h2 id="post-discussion-title" className="truncate font-display text-lg font-medium">
            {post.author.name}&apos;s post
          </h2>
          <Button className="absolute right-3" type="button" variant="ghost" size="icon" onClick={onClose} disabled={busy} title="Close discussion">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <article>
            <div className="flex items-center gap-3 p-4">
              <FeedAvatar user={post.author} />
              <div className="min-w-0">
                <Link href={`/profile/${post.author.id}`} className="block truncate text-sm font-medium hover:text-primary">
                  {post.author.name}
                </Link>
                <p className="truncate text-xs text-muted">
                  {post.author.headline ? `${post.author.headline} · ` : ''}{timeAgo(post.createdAt)}
                </p>
              </div>
            </div>
            {post.content ? <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-6">{post.content}</p> : null}
            {image ? (
              <div className="border-y border-border bg-surface-muted">
                <Image
                  src={image}
                  alt={`Post by ${post.author.name}`}
                  width={960}
                  height={640}
                  unoptimized={shouldBypassImageOptimizer(post.imageUrl)}
                  className="max-h-[520px] w-full object-contain"
                  sizes="(min-width: 640px) 672px, 100vw"
                />
              </div>
            ) : null}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs text-muted">
              <span>{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</span>
              <span>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</span>
            </div>
          </article>

          <div className="space-y-3 p-4">
            {commentsQuery.hasNextPage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => commentsQuery.fetchNextPage()}
                loading={commentsQuery.isFetchingNextPage}
                disabled={commentsQuery.isFetching}
              >
                View earlier comments
              </Button>
            ) : null}

            {commentsQuery.isPending && !comments.length ? (
              <div role="status" aria-label="Loading comments" className="space-y-3 py-2">
                <span className="sr-only">Loading comments</span>
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-start gap-2" aria-hidden="true">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="space-y-1.5 rounded-xl bg-surface-muted px-3 py-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3.5 w-56 max-w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {commentsQuery.isError ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm">
                <span>{getErrorMessage(commentsQuery.error, 'Comments could not be loaded.')}</span>
                <Button type="button" size="sm" variant="secondary" loading={commentsQuery.isFetching}
                  onClick={() => void (commentsQuery.isFetchNextPageError ? commentsQuery.fetchNextPage() : commentsQuery.refetch())}>Retry</Button>
              </div>
            ) : null}
            {!commentsQuery.isPending && !commentsQuery.isError && !comments.length ? (
              <div className="py-8 text-center text-sm text-muted">
                <MessageCircle className="mx-auto mb-2 h-5 w-5" />
                Be the first to comment.
              </div>
            ) : null}
            {comments.map((item) => (
              <CommentThread
                key={item.id} comment={item} currentUserId={currentUserId} currentUserRole={currentUserRole}
                busy={busy} replying={createReply.isPending && createReply.variables?.rootId === item.id}
                editingCommentId={editComment.isPending ? editComment.variables?.comment.id : undefined}
                deletingCommentId={deleteComment.isPending ? deleteComment.variables?.id : undefined}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            <div ref={bottomRef} aria-hidden="true" className="h-px" />
          </div>
        </div>

        <form onSubmit={submitComment} className="flex shrink-0 items-center gap-2 border-t border-border bg-surface p-3 sm:p-4">
          <input
            ref={inputRef}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            aria-label="Write a comment"
            placeholder="Write a comment..."
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-muted px-4 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            loading={createComment.isPending}
            disabled={busy || !comment.trim()}
            aria-label="Send comment"
            title="Send comment"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </section>
    </div>
    </DialogPortal>
  )
}

export function useDiscussionMutations(postId: number, viewerId?: number | null) {
  const client = useQueryClient()
  // Serialize changes within this discussion so count updates cannot race each other.
  const scope = { id: `post-discussion-${postId}` }
  const created = (comment: PostComment) => syncDiscussionChange(client, postId, { type: 'created', comment }, viewerId)
  const createComment = useMutation({
    scope,
    mutationFn: async (content: string) => requireComment(await postsApi.createComment(postId, content)),
    onSuccess: created,
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add comment')),
  })
  const createReply = useMutation({
    scope,
    mutationFn: async ({ rootId, content }: { rootId: number; content: string }) =>
      requireComment(await postsApi.createReply(postId, rootId, content)),
    onSuccess: created,
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add reply')),
  })
  const editComment = useMutation({
    scope,
    mutationFn: async ({ comment, content }: { comment: PostComment; content: string }) =>
      requireComment(await postsApi.updateComment(postId, comment.id, content)),
    onSuccess: (comment) => syncDiscussionChange(client, postId, { type: 'updated', comment }, viewerId),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not edit comment')),
  })
  const deleteComment = useMutation({
    scope,
    mutationFn: (comment: PostComment) => postsApi.deleteComment(postId, comment.id),
    onSuccess: async (_response, comment) => {
      await syncDiscussionChange(client, postId, { type: 'deleted', comment }, viewerId)
      toast.success(comment.parentId == null ? 'Comment deleted' : 'Reply deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete comment')),
  })
  return { createComment, createReply, editComment, deleteComment }
}

function requireComment(response: ApiResponse<PostComment>) {
  if (!response.content) throw new Error('The server did not return the saved comment. Please reload the discussion.')
  return response.content
}
