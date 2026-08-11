'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FeedPost, PostComment } from '@/shared/schemas'
import { cn, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { Button, Card } from '@/shared/ui'
import { FeedAvatar } from './feed-avatar'

export function FeedPostCard({
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
  const image = resolveAssetUrl(post.imageUrl)

  const isFirstVisible = index === 0

  return (
    <Card className="overflow-hidden">
      <article>
        <header className="flex items-start gap-3 p-4">
          <FeedAvatar user={post.author} />
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${post.author.id}`} className="block truncate text-sm font-bold hover:text-primary">
              {post.author.name}
            </Link>
            <p className="truncate text-xs text-muted">
              {post.author.headline || 'JobAura member'} - {formatPostDate(post.createdAt)}
            </p>
          </div>
          {post.author.id === currentUserId ? (
            <div className="relative">
              <Button type="button" variant="ghost" size="icon" onClick={() => setMenuOpen((value) => !value)} title="Post options">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 top-10 z-10 w-40 rounded-lg border border-border bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/5"
                    onClick={() => onDelete(post.id)}
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
          <div className="border-y border-border bg-surface-muted">
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
          <span>{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</span>
          <button type="button" className="hover:text-primary hover:underline" onClick={() => onOpenComments(post)}>
            {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          </button>
        </div>
        <div className="grid grid-cols-3 border-y border-border px-2 py-1">
          <button
            type="button"
            disabled={liking}
            onClick={() => onLike(post)}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded text-sm font-semibold hover:bg-surface-muted disabled:opacity-60',
              post.viewerHasLiked && 'text-danger'
            )}
          >
            <Heart className={cn('h-5 w-5', post.viewerHasLiked && 'fill-danger')} /> Like
          </button>
          <button
            type="button"
            className="flex h-10 items-center justify-center gap-2 rounded text-sm font-semibold hover:bg-surface-muted"
            onClick={() => onOpenComments(post)}
          >
            <MessageCircle className="h-5 w-5" /> Comment
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(post)}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded text-sm font-semibold hover:bg-surface-muted disabled:opacity-60',
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
}

export function CommentRow({ comment, actions }: { comment: PostComment; actions?: React.ReactNode }) {
  return (
    <div className="group/comment flex items-start gap-2">
      <FeedAvatar user={comment.author} size="sm" />
      <div className="min-w-0 rounded-lg bg-surface-muted px-3 py-2">
        <Link href={`/profile/${comment.author.id}`} className="text-xs font-bold hover:text-primary">{comment.author.name}</Link>
        <p className="whitespace-pre-wrap wrap-break-words text-sm leading-5">{comment.content}</p>
        {comment.updatedAt && comment.updatedAt !== comment.createdAt ? <span className="text-[11px] text-muted">Edited</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover/comment:opacity-100 sm:focus-within:opacity-100">{actions}</div> : null}
    </div>
  )
}

function formatPostDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`
}
