'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, Heart, MessageCircle, MoreHorizontal, ThumbsUp, Trash2 } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import type { FeedPost, PostComment } from '@/shared/schemas'
import { cn, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { Button, Card } from '@/shared/ui'
import { FeedAvatar } from './feed-avatar'
import { timeAgo } from './time-ago'

/** Memoized so liking/opening one post or typing in the composer does not re-render every post in the feed. */
export const FeedPostCard = memo(function FeedPostCard({
  post,
  currentUserId,
  index,
  liking,
  saving,
  onLike,
  onOpenComments,
  onDelete,
  onSave,
}: {
  post: FeedPost
  currentUserId: number
  index: number
  liking: boolean
  saving: boolean
  onLike: (post: FeedPost) => void
  onOpenComments: (post: FeedPost) => void
  onDelete: (postId: number) => void
  onSave: (post: FeedPost) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const image = resolveAssetUrl(post.imageUrl)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // The first two posts can be the largest image on screen (LCP), so they load right away.
  const isFirstVisible = index < 2

  return (
    <Card>
      <article>
        <header className="flex items-start gap-3 p-4">
          <FeedAvatar user={post.author} />
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${post.author.id}`} className="block truncate text-sm font-medium hover:text-primary">
              {post.author.name}
            </Link>
            <p className="truncate text-xs text-muted">
              {post.author.headline ? `${post.author.headline} · ` : ''}{timeAgo(post.createdAt)}
            </p>
          </div>
          {post.author.id === currentUserId ? (
            <div ref={menuRef} className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((value) => !value)}
                title="Post options"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
              {menuOpen ? (
                <div role="menu" className="menu-drop absolute right-0 top-10 z-20 w-40 rounded-lg border border-border bg-surface p-1 shadow-lg">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete(post.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete post
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        {post.content ? <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-6">{post.content}</p> : null}
        {image ? (
          <div className="overflow-hidden border-y border-border bg-surface-muted">
            <Image
              src={image}
              alt={`Post by ${post.author.name}`}
              width={960}
              height={640}
              unoptimized={shouldBypassImageOptimizer(post.imageUrl)}
              loading={isFirstVisible ? 'eager' : 'lazy'}
              fetchPriority={isFirstVisible ? 'high' : 'auto'}
              className="max-h-[620px] w-full object-contain"
              sizes="(min-width: 1024px) 640px, 100vw"
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            {post.likeCount > 0 ? (
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-white ring-2 ring-surface">
                <ThumbsUp className="h-2.5 w-2.5 fill-current" />
              </span>
            ) : null}
            {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
          </span>
          <button type="button" className="hover:text-primary hover:underline" onClick={() => onOpenComments(post)}>
            {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          </button>
        </div>
        <div className="grid grid-cols-3 border-y border-border px-2 py-1">
          <button
            type="button"
            disabled={liking}
            aria-pressed={post.viewerHasLiked}
            aria-busy={liking}
            onClick={() => onLike(post)}
            className={cn(
              'interaction flex h-10 items-center justify-center gap-2 rounded text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary-bright hover:bg-surface-muted disabled:opacity-60',
              post.viewerHasLiked && 'text-danger'
            )}
          >
            <Heart className={cn('h-5 w-5 transition-colors', post.viewerHasLiked && 'fill-danger')} /> {post.viewerHasLiked ? 'Liked' : 'Like'}
          </button>
          <button
            type="button"
            className="interaction flex h-10 items-center justify-center gap-2 rounded text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary-bright hover:bg-surface-muted"
            onClick={() => onOpenComments(post)}
          >
            <MessageCircle className="h-5 w-5" /> Comment
          </button>
          <button
            type="button"
            disabled={saving}
            aria-pressed={post.viewerHasSaved}
            aria-busy={saving}
            aria-label={post.viewerHasSaved ? 'Remove saved post' : 'Save post'}
            onClick={() => onSave(post)}
            className={cn(
              'interaction flex h-10 items-center justify-center gap-2 rounded text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary-bright hover:bg-surface-muted disabled:opacity-60',
              post.viewerHasSaved && 'text-primary'
            )}
          >
            <Bookmark className={cn('h-5 w-5', post.viewerHasSaved && 'fill-primary')} />
            <span className="hidden sm:inline">{post.viewerHasSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {post.recentComments.length ? (
          <div className="space-y-3 p-4">
            {post.recentComments.map((item) => <CommentRow key={item.id} comment={item} />)}
          </div>
        ) : null}
      </article>
    </Card>
  )
})

export function CommentRow({ comment, actions }: { comment: PostComment; actions?: React.ReactNode }) {
  const edited = Boolean(comment.updatedAt && comment.updatedAt !== comment.createdAt)
  return (
    <div className="group/comment flex items-start gap-2">
      <FeedAvatar user={comment.author} size="sm" />
      <div className="min-w-0 rounded-xl bg-surface-muted px-3 py-2">
        <p className="flex items-baseline gap-1.5 text-xs">
          <Link href={`/profile/${comment.author.id}`} className="truncate font-medium hover:text-primary">{comment.author.name}</Link>
          <span className="shrink-0 text-xs text-muted">
            {timeAgo(comment.createdAt)}{edited ? ' · Edited' : ''}
          </span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap wrap-break-words text-sm leading-5">{comment.content}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover/comment:opacity-100 sm:focus-within:opacity-100">{actions}</div> : null}
    </div>
  )
}
