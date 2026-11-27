'use client'

/**
 * Single comment or reply row inside the feed post discussion modal.
 * Displays the comment text along with inline edit controls for the author and delete confirmation for the author or an admin.
 *
 * Calls: CommentRow; ConfirmationDialog
 * Used by:
 *   - features/feed/components/comment-thread.tsx
 */

import { Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { PostComment } from '@/shared/schemas'
import { Button, ConfirmationDialog } from '@/shared/ui'
import { CommentRow } from './feed-post-card'

export type DiscussionCommentProps = {
  comment: PostComment
  currentUserId: number
  currentUserRole?: string | null
  busy?: boolean
  editingCommentId?: number
  deletingCommentId?: number
  onEdit: (comment: PostComment, content: string) => Promise<void>
  onDelete: (comment: PostComment) => Promise<void>
}

export function DiscussionComment({
  comment, currentUserId, currentUserRole, busy, editingCommentId, deletingCommentId,
  onEdit, onDelete, children,
}: DiscussionCommentProps & { children?: ReactNode }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const canEdit = comment.authorId === currentUserId
  const canDelete = canEdit || currentUserRole === 'admin'
  const isReply = comment.parentId != null
  const label = isReply ? 'reply' : 'comment'

  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (busy || !content || content === comment.content) return
    try {
      await onEdit(comment, content)
      setEditing(false)
    } catch {
      // The mutation shows an error; keep the draft and editor open for retry.
    }
  }
  async function remove() {
    try {
      await onDelete(comment)
      setConfirmingDelete(false)
    } catch {
      // Keep confirmation open so a failed request can be retried.
    }
  }

  return (
    <div className="min-w-0">
      {editing ? (
        <form onSubmit={save} className="space-y-2 rounded-lg bg-surface-muted p-3">
          <textarea
            autoFocus aria-label={`Edit ${label}`} maxLength={1000} rows={2}
            value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy}
            className="w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={editingCommentId === comment.id}
              disabled={busy || !draft.trim() || draft.trim() === comment.content}>Save changes</Button>
          </div>
        </form>
      ) : <CommentRow comment={comment} />}
      <div className="ml-9 mt-1 flex flex-wrap items-center gap-1">
        {children}
        {canEdit && !editing ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={busy}
            aria-label={`Edit ${label}`} title={`Edit ${label}`}
            onClick={() => { setDraft(comment.content); setEditing(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {canDelete ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-danger" disabled={busy}
            aria-label={`Delete ${label}`} title={`Delete ${label}`} onClick={() => setConfirmingDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      <ConfirmationDialog
        open={confirmingDelete} title={`Delete ${label}?`} confirmLabel={`Delete ${label}`}
        description={!isReply && comment.replyCount > 0
          ? 'This comment and all its replies will be permanently removed.'
          : `This ${label} will be permanently removed from the discussion.`}
        pending={deletingCommentId === comment.id}
        onCancel={() => setConfirmingDelete(false)} onConfirm={() => void remove()}
      />
    </div>
  )
}
