'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { postsApi } from '@/shared/api/endpoints'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ApiResponse, PostComment } from '@/shared/schemas'
import { syncDiscussionChange } from './discussion-cache'

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
