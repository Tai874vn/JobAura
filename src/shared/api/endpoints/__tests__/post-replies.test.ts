import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '../../client'
import { postsApi } from '../posts'

const originalAdapter = apiClient.defaults.adapter
const reply = {
  id: 8, postId: 10, authorId: 6, parentId: 4, content: 'Thanks for explaining this.',
  createdAt: '2026-10-12T00:00:00.000Z', updatedAt: '2026-10-12T00:00:00.000Z',
  author: { id: 6, name: 'User', avatar: null, headline: null }, replyCount: 0,
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
})

describe('post reply requests', () => {
  it('creates a reply with trimmed content, credentials and the existing CSRF interceptor', async () => {
    vi.stubGlobal('document', { cookie: 'csrf_token=reply-token' })
    let request: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = (async (config) => {
      request = config
      return { data: { message: 'Reply created successfully', content: reply }, status: 201, statusText: 'Created', headers: {}, config }
    }) satisfies AxiosAdapter

    const result = await postsApi.createReply(10, 4, '  Thanks for explaining this.  ')

    expect(request?.url).toBe('/api/posts/10/comments/4/replies')
    expect(request?.method).toBe('post')
    expect(JSON.parse(request!.data)).toEqual({ content: 'Thanks for explaining this.' })
    expect(request?.withCredentials).toBe(true)
    expect(request?.headers.get('X-CSRF-Token')).toBe('reply-token')
    expect(result.content).toEqual(reply)
  })

  it('preserves newest-first replies and the numeric cursor from each page', async () => {
    const requests: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = (async (config) => {
      requests.push(config)
      const content = config.params.cursor
        ? { data: [{ ...reply, id: 7 }], nextCursor: null }
        : { data: [reply, { ...reply, id: 7 }], nextCursor: 7 }
      return { data: { content }, status: 200, statusText: 'OK', headers: {}, config }
    }) satisfies AxiosAdapter

    const first = await postsApi.replies(10, 4)
    const last = await postsApi.replies(10, 4, first.content!.nextCursor!)

    expect(requests[0].url).toBe('/api/posts/10/comments/4/replies')
    expect(requests[0].params).toEqual({ limit: 10, cursor: undefined })
    expect(requests[1].params).toEqual({ limit: 10, cursor: 7 })
    expect(first.content?.data.map((item) => item.id)).toEqual([8, 7])
    expect(first.content?.data[0].parentId).toBe(4)
    expect(last.content?.nextCursor).toBeNull()
  })

  it.each(['   ', 'x'.repeat(1001)])('rejects invalid reply content before sending a request', async (content) => {
    let calls = 0
    apiClient.defaults.adapter = async () => { calls++; throw new Error('Unexpected network call') }

    await expect(postsApi.createReply(10, 4, content)).rejects.toThrow()
    expect(calls).toBe(0)
  })
})
