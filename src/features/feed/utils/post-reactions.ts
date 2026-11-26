import { mutationOptions, type InfiniteData, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { postsApi, savedItemsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { FeedPage, FeedPost } from '@/shared/schemas'
import { togglePostLike, togglePostSaved } from './feed-data'

type FeedCache = InfiniteData<FeedPage, string | null>

export function postLikeOptions(client: QueryClient, viewerId?: number | null) {
  const feedKey = queryKeys.feed(viewerId)
  return mutationOptions({
    mutationFn: ({ id, liked }: { id: number; liked: boolean }) => liked ? postsApi.like(id) : postsApi.unlike(id),
    onMutate: async ({ id, liked }) => {
      await client.cancelQueries({ queryKey: feedKey })
      const previous = client.getQueryData<FeedCache>(feedKey)
      client.setQueryData<FeedCache>(feedKey, (cache) => mapPost(cache, id, (post) => togglePostLike(post, liked)))
      return { previous }
    },
    onError: (error, _variables, context) => {
      client.setQueryData(feedKey, context?.previous)
      toast.error(getErrorMessage(error, 'Could not update like'))
    },
    onSettled: () => client.invalidateQueries({ queryKey: feedKey }),
  })
}

export function postSaveOptions(client: QueryClient, viewerId?: number | null) {
  const feedKey = queryKeys.feed(viewerId)
  const savedKey = queryKeys.savedPosts(viewerId)
  return mutationOptions({
    mutationFn: ({ id, saved }: { id: number; saved: boolean }) =>
      saved ? savedItemsApi.savePost(id) : savedItemsApi.unsavePost(id),
    onMutate: async ({ id, saved }) => {
      await client.cancelQueries({ queryKey: feedKey })
      const previous = client.getQueryData<FeedCache>(feedKey)
      client.setQueryData<FeedCache>(feedKey, (cache) => mapPost(cache, id, (post) => togglePostSaved(post, saved)))
      return { previous }
    },
    onError: (error, _variables, context) => {
      client.setQueryData(feedKey, context?.previous)
      toast.error(getErrorMessage(error, 'Could not update saved posts'))
    },
    onSettled: () => Promise.all([
      client.invalidateQueries({ queryKey: feedKey }),
      client.invalidateQueries({ queryKey: savedKey }),
    ]),
  })
}

function mapPost(cache: FeedCache | undefined, id: number, update: (post: FeedPost) => FeedPost) {
  if (!cache) return cache
  return {
    ...cache,
    pages: cache.pages.map((page) => ({ ...page, data: page.data.map((post) => post.id === id ? update(post) : post) })),
  }
}
