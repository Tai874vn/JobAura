'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { Check, MessageCircle, Pencil, RefreshCw, Send, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { postsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { FeedPost, PostComment } from '@/shared/schemas'
import { Button, ConfirmationDialog } from '@/shared/ui'
import { mergeComments } from './feed-data'
import { FeedAvatar } from './feed-avatar'
import { CommentRow } from './feed-post-card'
import { timeAgo } from './time-ago'

export function PostDiscussionModal({
  post,
  open,
  currentUserId,
  currentUserRole,
  submitting,
  editingCommentId,
  deletingCommentId,
  onClose,
  onSubmit,
  onEdit,
  onDelete,
}: {
  post: FeedPost
  open: boolean
  currentUserId: number
  currentUserRole?: string | null
  submitting: boolean
  editingCommentId?: number
  deletingCommentId?: number
  onClose: () => void
  onSubmit: (postId: number, content: string) => Promise<void>
  onEdit: (postId: number, commentId: number, content: string) => Promise<void>
  onDelete: (postId: number, commentId: number) => Promise<void>
}) {
  const [comment, setComment] = useState('')
  const [activeEditId, setActiveEditId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [commentToDelete, setCommentToDelete] = useState<PostComment | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const didInitialScroll = useRef(false)
  const image = resolveAssetUrl(post.imageUrl)
  const commentsQuery = useInfiniteQuery({
    queryKey: queryKeys.postComments(post.id),
    queryFn: async ({ pageParam }) =>
      (await postsApi.comments(post.id, pageParam ?? undefined, 5)).content ?? { data: [], nextCursor: null },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  const loadedGroups = commentsQuery.data?.pages.map((page) => page.data) ?? []
  const comments = mergeComments([...loadedGroups, post.recentComments])

  useEffect(() => {
    if (!open || !comments.length) return
    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: didInitialScroll.current ? 'smooth' : 'auto', block: 'end' })
      didInitialScroll.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [comments.length, open])

  if (!open) return null

  async function submitComment(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = comment.trim()
    if (!content) return
    try {
      await onSubmit(post.id, content)
      setComment('')
    } catch {
      // Mutation errors are presented by the feed toast and the draft stays intact.
    }
  }

  function startEditing(item: PostComment) {
    setActiveEditId(item.id)
    setEditContent(item.content)
  }

  async function saveEdit(event: React.SubmitEvent<HTMLFormElement>, item: PostComment) {
    event.preventDefault()
    const content = editContent.trim()
    if (!content || content === item.content) return
    try {
      await onEdit(post.id, item.id, content)
      setActiveEditId(null)
      setEditContent('')
    } catch {
      // Mutation errors are presented by the feed toast and edit mode stays open.
    }
  }

  async function confirmDelete() {
    if (!commentToDelete) return
    try {
      await onDelete(post.id, commentToDelete.id)
      if (activeEditId === commentToDelete.id) setActiveEditId(null)
      setCommentToDelete(null)
    } catch {
      // Mutation errors are presented by the feed toast and confirmation stays open.
    }
  }

  return (
    <div
      className="motion-overlay fixed inset-0 z-70 flex items-center justify-center bg-black/55 p-0 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-discussion-title"
        className="motion-panel flex h-full w-full max-w-2xl flex-col overflow-hidden bg-surface shadow-2xl sm:h-[min(900px,calc(100vh-40px))] sm:rounded-lg"
      >
        <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-border px-14">
          <h2 id="post-discussion-title" className="truncate font-display text-lg font-bold">
            {post.author.name}&apos;s post
          </h2>
          <Button className="absolute right-3" type="button" variant="ghost" size="icon" onClick={onClose} title="Close discussion">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <article>
            <div className="flex items-center gap-3 p-4">
              <FeedAvatar user={post.author} />
              <div className="min-w-0">
                <Link href={`/profile/${post.author.id}`} className="block truncate text-sm font-bold hover:text-primary">
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
                disabled={commentsQuery.isFetchingNextPage}
              >
                {commentsQuery.isFetchingNextPage ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                View earlier comments
              </Button>
            ) : null}

            {commentsQuery.isPending && !comments.length ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading comments
              </div>
            ) : null}
            {commentsQuery.isError ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm">
                <span>Comments could not be loaded.</span>
                <Button type="button" size="sm" variant="secondary" onClick={() => commentsQuery.refetch()}>Retry</Button>
              </div>
            ) : null}
            {!commentsQuery.isPending && !commentsQuery.isError && !comments.length ? (
              <div className="py-8 text-center text-sm text-muted">
                <MessageCircle className="mx-auto mb-2 h-5 w-5" />
                Be the first to comment.
              </div>
            ) : null}
            {comments.map((item) => {
              const canEdit = item.authorId === currentUserId
              const canDelete = canEdit || currentUserRole === 'admin'
              if (activeEditId === item.id) {
                return (
                  <form key={item.id} onSubmit={(event) => saveEdit(event, item)} className="flex items-start gap-2">
                    <FeedAvatar user={item.author} size="sm" />
                    <div className="min-w-0 flex-1 rounded-lg bg-surface-muted p-2">
                      <input
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        maxLength={1000}
                        autoFocus
                        aria-label="Edit comment"
                        className="h-10 w-full rounded-full border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                      />
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setActiveEditId(null)
                            setEditContent('')
                          }}
                          disabled={editingCommentId === item.id}
                          title="Cancel editing"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          type="submit"
                          size="icon"
                          className="h-8 w-8"
                          disabled={editingCommentId === item.id || !editContent.trim() || editContent.trim() === item.content}
                          title="Save comment"
                        >
                          {editingCommentId === item.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </form>
                )
              }
              return (
                <CommentRow
                  key={item.id}
                  comment={item}
                  actions={canEdit || canDelete ? (
                    <>
                      {canEdit ? (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(item)} title="Edit comment">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-danger"
                          onClick={() => setCommentToDelete(item)}
                          disabled={deletingCommentId === item.id}
                          title="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </>
                  ) : undefined}
                />
              )
            })}
            <div ref={bottomRef} aria-hidden="true" className="h-px" />
          </div>
        </div>

        <form onSubmit={submitComment} className="flex shrink-0 items-center gap-2 border-t border-border bg-surface p-3 sm:p-4">
          <input
            ref={inputRef}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder="Write a comment..."
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface-muted px-4 text-sm outline-none transition focus:border-primary focus:bg-surface"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            loading={submitting}
            disabled={!comment.trim()}
            aria-label="Send comment"
            title="Send comment"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </section>
      <ConfirmationDialog
        open={Boolean(commentToDelete)}
        title="Delete comment?"
        description="This comment will be permanently removed from the discussion."
        confirmLabel="Delete comment"
        pending={deletingCommentId === commentToDelete?.id}
        onCancel={() => setCommentToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
