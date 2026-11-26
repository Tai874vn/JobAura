import { describe, expect, it } from 'vitest'
import type { FeedPage, FeedPost, PostComment } from '@/shared/schemas'
import {
  addCommentToPost,
  appendCommentToPages,
  mergeComments,
  mergeFeedPages,
  mergeReplies,
  removeCommentFromPages,
  removeCommentFromPost,
  togglePostLike,
  togglePostSaved,
  updateCommentInPages,
  updateCommentInPost,
  type CommentCache,
} from '../feed-data'

const post = (id: number, overrides: Partial<FeedPost> = {}): FeedPost => ({
  id,
  content: `Post ${id}`,
  imageUrl: null,
  createdAt: '2026-06-19T02:00:00.000Z',
  updatedAt: '2026-06-19T02:00:00.000Z',
  author: { id: 6, name: 'Tai', avatar: null, headline: null },
  likeCount: 0,
  commentCount: 0,
  viewerHasLiked: false,
  viewerHasSaved: false,
  recentComments: [],
  ...overrides,
})

const comment = (id: number): PostComment => ({
  id,
  postId: 2,
  authorId: 6,
  parentId: null,
  replyCount: 0,
  content: `Comment ${id}`,
  createdAt: `2026-06-19T02:${String(id).padStart(2, '0')}:00.000Z`,
  author: { id: 6, name: 'Tai', avatar: null, headline: null },
})

describe('feed data helpers', () => {
  it('merges infinite pages without duplicate posts', () => {
    const pages: FeedPage[] = [
      { data: [post(3), post(2)], nextCursor: 'connections-2' },
      { data: [post(2), post(1)], nextCursor: null },
    ]

    expect(mergeFeedPages(pages).map((item) => item.id)).toEqual([3, 2, 1])
  })

  it('optimistically toggles a like and keeps the count valid', () => {
    expect(togglePostLike(post(2), true)).toMatchObject({ viewerHasLiked: true, likeCount: 1 })
    expect(togglePostLike(post(2, { viewerHasLiked: true, likeCount: 0 }), false)).toMatchObject({
      viewerHasLiked: false,
      likeCount: 0,
    })
  })

  it('optimistically toggles saved state', () => {
    expect(togglePostSaved(post(2), true).viewerHasSaved).toBe(true)
    expect(togglePostSaved(post(2, { viewerHasSaved: true }), false).viewerHasSaved).toBe(false)
  })

  it('deduplicates comments and displays them chronologically', () => {
    expect(mergeComments([[comment(5), comment(4)], [comment(4), comment(3)]]).map((item) => item.id))
      .toEqual([3, 4, 5])
  })

  it('keeps five preview comments and increments the count only for a new comment', () => {
    const original = post(2, {
      commentCount: 5,
      recentComments: [comment(1), comment(2), comment(3), comment(4), comment(5)],
    })

    const updated = addCommentToPost(original, comment(6))
    expect(updated.recentComments.map((item) => item.id)).toEqual([2, 3, 4, 5, 6])
    expect(updated.commentCount).toBe(6)

    const duplicate = addCommentToPost(updated, comment(6))
    expect(duplicate.recentComments.map((item) => item.id)).toEqual([2, 3, 4, 5, 6])
    expect(duplicate.commentCount).toBe(6)
  })

  it('counts replies without adding them to the root-only preview', () => {
    const original = post(2, { commentCount: 3, recentComments: [{ ...comment(4), replyCount: 2 }] })
    const reply = { ...comment(8), parentId: 4 }
    const updated = addCommentToPost(original, reply)

    expect(updated.commentCount).toBe(4)
    expect(updated.recentComments.map((item) => item.id)).toEqual([4])
    expect(updated.recentComments[0].replyCount).toBe(3)
    expect(original.recentComments[0].replyCount).toBe(2)
  })

  it('excludes replies when merging root comments and previews', () => {
    expect(mergeComments([[comment(4), { ...comment(8), parentId: 4 }]]).map((item) => item.id))
      .toEqual([4])
  })

  it('deduplicates reply pages and preserves newest-first ID ordering', () => {
    const firstPage = [{ ...comment(8), parentId: 4 }, { ...comment(7), parentId: 4 }]
    const secondPage = [{ ...comment(7), parentId: 4 }, { ...comment(6), parentId: 4 }]
    expect(mergeReplies([secondPage, firstPage]).map((item) => item.id)).toEqual([8, 7, 6])
    expect(secondPage.map((item) => item.id)).toEqual([7, 6])
  })

  it('removes a root and its replies from the total discussion count', () => {
    const root = { ...comment(4), replyCount: 3 }
    const original = post(2, { commentCount: 5, recentComments: [root, comment(5)] })

    const updated = removeCommentFromPost(original, root)
    expect(updated.commentCount).toBe(1)
    expect(updated.recentComments.map((item) => item.id)).toEqual([5])
  })

  it('deleting a reply decrements its parent without removing the root', () => {
    const original = post(2, { commentCount: 3, recentComments: [{ ...comment(4), replyCount: 2 }] })
    const updated = removeCommentFromPost(original, { ...comment(8), parentId: 4 })

    expect(updated.commentCount).toBe(2)
    expect(updated.recentComments).toMatchObject([{ id: 4, replyCount: 1 }])
  })

  it('adds a comment to the first API page without losing pagination metadata', () => {
    const cache: CommentCache = {
      pages: [
        { data: [comment(5), comment(4)], nextCursor: 4 },
        { data: [comment(3), comment(2)], nextCursor: 2 },
      ],
      pageParams: [null, 4],
    }

    const updated = appendCommentToPages(cache, comment(6))
    expect(updated?.pages[0]).toEqual({ data: [comment(6), comment(5), comment(4)], nextCursor: 4 })
    expect(updated?.pages[1]).toEqual(cache.pages[1])
    expect(appendCommentToPages(updated, comment(6))?.pages[0].data.map((item) => item.id)).toEqual([6, 5, 4])
    expect(appendCommentToPages(undefined, comment(6))).toBeUndefined()
  })

  it('updates a comment in both feed preview and paginated cache', () => {
    const updatedComment = { ...comment(5), content: 'Edited comment', updatedAt: '2026-06-19T03:00:00.000Z' }
    const originalPost = post(2, { commentCount: 2, recentComments: [comment(4), comment(5)] })
    const cache: CommentCache = {
      pages: [{ data: [comment(5), comment(4)], nextCursor: 4 }],
      pageParams: [null],
    }

    expect(updateCommentInPost(originalPost, updatedComment).recentComments[1]).toEqual(updatedComment)
    expect(updateCommentInPost(originalPost, updatedComment).commentCount).toBe(2)
    expect(updateCommentInPages(cache, updatedComment)?.pages[0].data[0]).toEqual(updatedComment)
  })

  it('removes a comment without hiding unrelated comments', () => {
    const originalPost = post(2, { commentCount: 3, recentComments: [comment(3), comment(4), comment(5)] })
    const cache: CommentCache = {
      pages: [
        { data: [comment(5), comment(4)], nextCursor: 4 },
        { data: [comment(3), comment(2)], nextCursor: null },
      ],
      pageParams: [null, 4],
    }

    const updatedPost = removeCommentFromPost(originalPost, comment(4))
    expect(updatedPost.recentComments.map((item) => item.id)).toEqual([3, 5])
    expect(updatedPost.commentCount).toBe(2)
    expect(removeCommentFromPages(cache, 4)?.pages.map((page) => page.data.map((item) => item.id)))
      .toEqual([[5], [3, 2]])
  })

})
