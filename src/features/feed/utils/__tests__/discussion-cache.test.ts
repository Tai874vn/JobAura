import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import type { FeedPage, FeedPost, PostComment } from '@/shared/schemas'
import type { CommentCache } from '../feed-data'
import { syncDiscussionChange } from '../discussion-cache'

const root: PostComment = {
  id: 4, postId: 10, authorId: 6, parentId: null, replyCount: 2, content: 'Root',
  createdAt: '2026-10-12T00:00:00Z', author: { id: 6, name: 'User', avatar: null, headline: null },
}
const reply: PostComment = { ...root, id: 8, parentId: 4, replyCount: 0, content: 'Reply' }
const post: FeedPost = {
  id: 10, content: 'Post', imageUrl: null, createdAt: root.createdAt, updatedAt: root.createdAt,
  author: root.author, likeCount: 0, commentCount: 3, viewerHasLiked: false, viewerHasSaved: true,
  recentComments: [root],
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const page = (data: PostComment[]): CommentCache => ({ pages: [{ data, nextCursor: 7 }], pageParams: [null] })
function seed() {
  const cache: InfiniteData<FeedPage, string | null> = {
    pages: [{ data: [post, { ...post, id: 99, commentCount: 20 }], nextCursor: 'feed-next' }], pageParams: [null],
  }
  client.setQueryData(queryKeys.feed(), cache)
  client.setQueryData(queryKeys.savedPosts(), cache)
  client.setQueryData(queryKeys.postComments(10), page([root]))
  client.setQueryData(queryKeys.postReplies(10, 4), page([{ ...reply, id: 7 }]))
  client.setQueryData(queryKeys.postReplies(10, 9), page([]))
}
function cachedPost(key: readonly unknown[]) {
  return client.getQueryData<InfiniteData<FeedPage>>(key)!.pages[0].data[0]
}
afterEach(() => client.clear())

describe('discussion cache synchronization', () => {
  it('adds a reply only to its thread and refreshes feed, saved and root counts', async () => {
    seed()
    await syncDiscussionChange(client, 10, { type: 'created', comment: reply })

    expect(cachedPost(queryKeys.feed())).toMatchObject({ commentCount: 4, recentComments: [{ id: 4, replyCount: 3 }] })
    expect(cachedPost(queryKeys.savedPosts()).commentCount).toBe(4)
    const roots = client.getQueryData<CommentCache>(queryKeys.postComments(10))!
    expect(roots.pages[0].data).toMatchObject([{ id: 4, replyCount: 3 }])
    const replies = client.getQueryData<CommentCache>(queryKeys.postReplies(10, 4))!
    expect(replies.pages[0].data.map((item) => item.id)).toEqual([8, 7])
    expect(replies.pages[0].nextCursor).toBe(7)
    expect(replies.pageParams).toEqual([null])
    for (const key of [queryKeys.feed(), queryKeys.savedPosts(), queryKeys.postComments(10), queryKeys.postReplies(10, 4)]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    }
    expect(client.getQueryState(queryKeys.postReplies(10, 9))?.isInvalidated).toBe(false)
    expect(client.getQueryData<InfiniteData<FeedPage>>(queryKeys.feed())!.pages[0].data[1].commentCount).toBe(20)
  })

  it('removes a deleted root, its total reply count and the stale thread cache', async () => {
    seed()
    await syncDiscussionChange(client, 10, { type: 'deleted', comment: root })

    expect(cachedPost(queryKeys.feed())).toMatchObject({ commentCount: 0, recentComments: [] })
    expect(cachedPost(queryKeys.savedPosts()).commentCount).toBe(0)
    expect(client.getQueryData<CommentCache>(queryKeys.postComments(10))!.pages[0].data).toEqual([])
    expect(client.getQueryData(queryKeys.postReplies(10, 4))).toBeUndefined()
    expect(client.getQueryData(queryKeys.postReplies(10, 9))).toBeDefined()
  })

  it('removes only the selected reply and decrements its root count', async () => {
    seed()
    await syncDiscussionChange(client, 10, { type: 'deleted', comment: { ...reply, id: 7 } })

    expect(cachedPost(queryKeys.feed())).toMatchObject({ commentCount: 2, recentComments: [{ id: 4, replyCount: 1 }] })
    expect(client.getQueryData<CommentCache>(queryKeys.postReplies(10, 4))!.pages[0].data).toEqual([])
    expect(client.getQueryData<CommentCache>(queryKeys.postComments(10))!.pages[0].data[0].replyCount).toBe(1)
  })

  it('edits a reply without changing discussion totals or leaking it into previews', async () => {
    seed()
    await syncDiscussionChange(client, 10, { type: 'updated', comment: { ...reply, id: 7, content: 'Edited' } })

    expect(client.getQueryData<CommentCache>(queryKeys.postReplies(10, 4))!.pages[0].data[0].content).toBe('Edited')
    expect(cachedPost(queryKeys.feed())).toMatchObject({ commentCount: 3, recentComments: [{ id: 4, content: 'Root' }] })
  })

  it('does not seed partial feed or thread lists that have never been loaded', async () => {
    await syncDiscussionChange(client, 10, { type: 'created', comment: reply })
    expect(client.getQueryData(queryKeys.feed())).toBeUndefined()
    expect(client.getQueryData(queryKeys.postReplies(10, 4))).toBeUndefined()
  })
})
