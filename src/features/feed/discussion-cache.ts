import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import type { FeedPage, FeedPost, PostComment } from '@/shared/schemas'
import {
  addCommentToPost, adjustRootReplyCount, appendCommentToPages, removeCommentFromPages,
  removeCommentFromPost, updateCommentInPages, updateCommentInPost, type CommentCache,
} from './feed-data'

type DiscussionChange = { type: 'created' | 'updated' | 'deleted'; comment: PostComment }

export async function syncDiscussionChange(
  client: QueryClient,
  postId: number,
  change: DiscussionChange,
  viewerId?: number | null,
) {
  const { comment, type } = change
  const feedKey = queryKeys.feed(viewerId)
  const savedKey = queryKeys.savedPosts(viewerId)
  const rootsKey = queryKeys.postComments(postId)
  const threadKey = queryKeys.postReplies(postId, comment.parentId ?? comment.id)
  const keys = [feedKey, savedKey, rootsKey, threadKey]
  // Do not let an older in-flight response overwrite the confirmed mutation.
  await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey, exact: true })))

  for (const key of [feedKey, savedKey]) {
    client.setQueryData<InfiniteData<FeedPage, string | null>>(key, (cache) => cache && ({
      ...cache,
      pages: cache.pages.map((page) => ({
        ...page,
        data: page.data.map((post) => post.id === postId ? updatePost(post, change) : post),
      })),
    }))
  }
  client.setQueryData<CommentCache>(rootsKey, (cache) => {
    if (comment.parentId == null) return updatePages(cache, change)
    if (!cache || type === 'updated') return cache
    return {
      ...cache,
      pages: cache.pages.map((page) => ({
        ...page, data: adjustRootReplyCount(page.data, comment.parentId!, type === 'created' ? 1 : -1),
      })),
    }
  })
  if (comment.parentId != null) {
    client.setQueryData<CommentCache>(threadKey, (cache) => updatePages(cache, change))
  } else if (type === 'deleted') {
    client.removeQueries({ queryKey: threadKey, exact: true })
  }
  // Server counts remain authoritative, including concurrent replies by other users.
  await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey, exact: true })))
}

function updatePost(post: FeedPost, change: DiscussionChange) {
  if (change.type === 'created') return addCommentToPost(post, change.comment)
  if (change.type === 'updated') return updateCommentInPost(post, change.comment)
  return removeCommentFromPost(post, change.comment)
}

function updatePages(cache: CommentCache | undefined, change: DiscussionChange) {
  if (change.type === 'created') return appendCommentToPages(cache, change.comment)
  if (change.type === 'updated') return updateCommentInPages(cache, change.comment)
  return removeCommentFromPages(cache, change.comment.id)
}
