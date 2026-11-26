'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { memo, useId, useMemo, useRef, useState } from 'react'
import { postsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, Skeleton } from '@/shared/ui'
import { DiscussionComment, type DiscussionCommentProps } from './discussion-comment'
import { mergeReplies } from '../utils/feed-data'

/** Memoized so typing in the modal's main comment box does not re-render every comment thread. */
export const CommentThread = memo(function CommentThread({ onReply, replying, ...props }: DiscussionCommentProps & {
  onReply: (rootId: number, content: string) => Promise<void>
  replying?: boolean
}) {
  const { comment, busy } = props
  const [expanded, setExpanded] = useState(false)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelId = useId()
  // Data: postsApi.replies → GET /api/posts/:postId/comments/:commentId/replies → NestjsBE/src/modules/posts/services/posts.service.ts getReplies()
  const repliesQuery = useInfiniteQuery({
    queryKey: queryKeys.postReplies(comment.postId, comment.id),
    queryFn: async ({ pageParam }) => {
      const response = await postsApi.replies(comment.postId, comment.id, pageParam ?? undefined)
      if (!response.content) throw new Error('The server did not return replies')
      return response.content
    },
    initialPageParam: null as number | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: expanded,
  })
  const replies = useMemo(
    () => mergeReplies(repliesQuery.data?.pages.map((page) => page.data) ?? []),
    [repliesQuery.data?.pages],
  )

  function startReply() {
    setExpanded(true)
    setComposing(true)
    // An already-open composer still receives focus when replying to another entry.
    inputRef.current?.focus()
  }
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (busy || !content) return
    try {
      // Every entry in this one-level thread replies to the root, never a reply ID.
      await onReply(comment.id, content)
      setDraft((current) => current.trim() === content ? '' : current)
    } catch {
      // The mutation shows an error and the draft stays available for retry.
    }
  }

  return (
    <div className="min-w-0 space-y-2">
      <DiscussionComment {...props}>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={startReply}>Reply</Button>
        {comment.replyCount > 0 || expanded ? (
          <Button type="button" variant="ghost" size="sm" aria-expanded={expanded} aria-controls={panelId}
            onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Hide replies' : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
          </Button>
        ) : null}
      </DiscussionComment>
      {expanded ? (
        <div id={panelId} className="ml-4 space-y-3 border-l-2 border-border pl-3 sm:ml-9 sm:pl-4">
          {repliesQuery.isPending ? (
            <div role="status" aria-label="Loading replies" className="space-y-2.5 py-1">
              <span className="sr-only">Loading replies…</span>
              {[0, 1].map((item) => (
                <div key={item} className="flex items-start gap-2" aria-hidden="true">
                  <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="space-y-1.5 rounded-xl bg-surface-muted px-3 py-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3.5 w-44" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {replies.map((reply) => (
            <DiscussionComment key={reply.id} {...props} comment={reply}>
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={startReply}>Reply</Button>
            </DiscussionComment>
          ))}
          {repliesQuery.isError ? (
            <div role="alert" className="space-y-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm">
              <p>{getErrorMessage(repliesQuery.error, 'Replies could not be loaded.')}</p>
              <Button type="button" size="sm" variant="secondary" loading={repliesQuery.isFetching}
                onClick={() => void (repliesQuery.isFetchNextPageError ? repliesQuery.fetchNextPage() : repliesQuery.refetch())}>Retry</Button>
            </div>
          ) : null}
          {!repliesQuery.isPending && !repliesQuery.isError && !replies.length ? (
            <p className="text-xs text-muted">No replies yet. Start the conversation.</p>
          ) : null}
          {repliesQuery.hasNextPage && !repliesQuery.isError ? (
            <Button type="button" size="sm" variant="ghost" loading={repliesQuery.isFetchingNextPage}
              disabled={repliesQuery.isFetching} onClick={() => void repliesQuery.fetchNextPage()}>Load more replies</Button>
          ) : null}
          {composing ? (
            <form onSubmit={submit} className="space-y-2 rounded-lg bg-surface-muted p-3">
              <label htmlFor={`${panelId}-draft`} className="block text-xs font-medium">Reply to {comment.author.name}</label>
              <textarea id={`${panelId}-draft`} ref={inputRef} autoFocus maxLength={1000} rows={2}
                placeholder="Write a reply…" value={draft} onChange={(event) => setDraft(event.target.value)}
                className="w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-bright" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted">{draft.length}/1,000</span>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" disabled={replying} onClick={() => setComposing(false)}>Cancel</Button>
                  <Button type="submit" size="sm" loading={replying} disabled={busy || !draft.trim()}>Send reply</Button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})
