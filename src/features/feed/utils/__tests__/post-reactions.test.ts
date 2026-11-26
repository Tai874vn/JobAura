import { MutationObserver, QueryClient, QueryObserver, type InfiniteData } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import type { FeedPage, FeedPost, PostComment } from '@/shared/schemas'
import { syncDiscussionChange } from '../discussion-cache'
import { postLikeOptions, postSaveOptions } from '../post-reactions'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => { apiClient.defaults.adapter = originalAdapter })

describe('post reaction reconciliation', () => {
  it.each(['like', 'save'] as const)('restores a pending %s after a discussion refetch overwrites its optimistic state', async (action) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    const author = { id: 6, name: 'User', avatar: null, headline: null }
    let post: FeedPost = {
      id: 10, content: 'Post', imageUrl: null, createdAt: '2026-10-12T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z',
      author, likeCount: 0, commentCount: 0, viewerHasLiked: false, viewerHasSaved: false, recentComments: [],
    }
    const snapshot = (): InfiniteData<FeedPage, string | null> => ({ pages: [{ data: [post], nextCursor: null }], pageParams: [null] })
    client.setQueryData(queryKeys.feed(6), snapshot())
    const feed = new QueryObserver(client, { queryKey: queryKeys.feed(6), queryFn: async () => snapshot() })
    const unsubscribe = feed.subscribe(() => undefined)
    let finishRequest!: () => void
    apiClient.defaults.adapter = (config) => new Promise((resolve) => {
      finishRequest = () => {
        post = { ...post, viewerHasLiked: action === 'like', viewerHasSaved: action === 'save', likeCount: action === 'like' ? 1 : 0 }
        resolve({ config, status: 200, statusText: 'OK', headers: {}, data: { message: 'Updated' } })
      }
    })
    const current = () => client.getQueryData<InfiniteData<FeedPage>>(queryKeys.feed(6))!.pages[0].data[0]
    const field = action === 'like' ? 'viewerHasLiked' : 'viewerHasSaved'
    const pending = action === 'like'
      ? new MutationObserver(client, postLikeOptions(client, 6)).mutate({ id: 10, liked: true })
      : new MutationObserver(client, postSaveOptions(client, 6)).mutate({ id: 10, saved: true })
    try {
      await vi.waitFor(() => { expect(finishRequest).toBeTypeOf('function'); expect(current()[field]).toBe(true) })
      const reply: PostComment = { id: 8, postId: 10, authorId: 6, parentId: 4, replyCount: 0, content: 'Reply', createdAt: post.createdAt, author }
      post = { ...post, commentCount: 1 }
      await syncDiscussionChange(client, 10, { type: 'created', comment: reply }, 6)
      expect(current()[field]).toBe(false)
      finishRequest()
      await pending
      expect(current()[field]).toBe(true)
      expect(current().commentCount).toBe(1)
    } finally {
      unsubscribe()
      client.clear()
    }
  })
})
