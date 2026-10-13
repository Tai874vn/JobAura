import type { InfiniteData } from '@tanstack/react-query'
import type { FeedPage, FeedPost, PostComment, UserProfile } from '@/shared/schemas'
import { calculateProfileCompletion } from '@/features/users/profile-posts'

export type CommentPage = { data: PostComment[]; nextCursor: number | null }
export type CommentCache = InfiniteData<CommentPage, number | null>

export function mergeFeedPages(pages: FeedPage[] | undefined) {
  const seen = new Set<number>()
  return (pages ?? []).flatMap((page) =>
    page.data.filter((post) => {
      if (seen.has(post.id)) return false
      seen.add(post.id)
      return true
    })
  )
}

export function togglePostLike(post: FeedPost, liked: boolean): FeedPost {
  if (post.viewerHasLiked === liked) return post
  return {
    ...post,
    viewerHasLiked: liked,
    likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)),
  }
}

export function togglePostSaved(post: FeedPost, saved: boolean): FeedPost {
  return post.viewerHasSaved === saved ? post : { ...post, viewerHasSaved: saved }
}

export function mergeComments(groups: PostComment[][]): PostComment[] {
  const comments = dedupeComments(groups.flat().filter((comment) => comment.parentId == null))
  return comments.sort((left, right) => {
    const timeDifference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    return timeDifference || left.id - right.id
  })
}

export function addCommentToPost(post: FeedPost, comment: PostComment, limit = 5): FeedPost {
  if (comment.parentId != null) {
    return {
      ...post,
      commentCount: post.commentCount + 1,
      recentComments: adjustRootReplyCount(post.recentComments, comment.parentId, 1),
    }
  }
  const exists = post.recentComments.some((item) => item.id === comment.id)
  const recentComments = mergeComments([post.recentComments, [comment]]).slice(-limit)
  return {
    ...post,
    commentCount: exists ? post.commentCount : post.commentCount + 1,
    recentComments,
  }
}

export function appendCommentToPages(
  cache: CommentCache | undefined,
  comment: PostComment
): CommentCache | undefined {
  if (!cache?.pages.length) return cache
  const [firstPage, ...remainingPages] = cache.pages
  return {
    ...cache,
    pages: [
      { ...firstPage, data: dedupeComments([comment, ...firstPage.data]) },
      ...remainingPages,
    ],
  }
}

export function updateCommentInPost(post: FeedPost, comment: PostComment): FeedPost {
  return {
    ...post,
    recentComments: post.recentComments.map((item) => item.id === comment.id ? comment : item),
  }
}

export function updateCommentInPages(
  cache: CommentCache | undefined,
  comment: PostComment
): CommentCache | undefined {
  if (!cache) return cache
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.map((item) => item.id === comment.id ? comment : item),
    })),
  }
}

export function removeCommentFromPost(post: FeedPost, comment: PostComment): FeedPost {
  return {
    ...post,
    commentCount: Math.max(0, post.commentCount - 1 - (comment.parentId == null ? comment.replyCount : 0)),
    recentComments: comment.parentId == null
      ? post.recentComments.filter((item) => item.id !== comment.id)
      : adjustRootReplyCount(post.recentComments, comment.parentId, -1),
  }
}

export function adjustRootReplyCount(comments: PostComment[], rootId: number, delta: number) {
  return comments.map((comment) => comment.id === rootId
    ? { ...comment, replyCount: Math.max(0, comment.replyCount + delta) }
    : comment)
}

export function mergeReplies(groups: PostComment[][]) {
  return dedupeComments(groups.flat()).sort((left, right) => right.id - left.id)
}

export function removeCommentFromPages(
  cache: CommentCache | undefined,
  commentId: number
): CommentCache | undefined {
  if (!cache) return cache
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.filter((comment) => comment.id !== commentId),
    })),
  }
}

export function getProfileCompleteness(user: UserProfile) {
  return calculateProfileCompletion(user)
}

function dedupeComments(comments: PostComment[]) {
  const seen = new Set<number>()
  return comments.filter((comment) => {
    if (seen.has(comment.id)) return false
    seen.add(comment.id)
    return true
  })
}
