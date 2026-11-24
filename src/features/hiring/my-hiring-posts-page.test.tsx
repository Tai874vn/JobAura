import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import type { HiringPost } from '@/shared/schemas'
import { MyHiringPostsPage } from './my-hiring-posts-page'
import { myPostsRequest } from './my-hiring-posts-view'

let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: () => undefined, push: () => undefined }),
  usePathname: () => '/my-hiring-posts',
  useSearchParams: () => new URLSearchParams(search),
}))

const post = (id: number, change: Partial<HiringPost> = {}): HiringPost => ({
  id, recruiterId: 2, title: `Role ${id}`, description: '', skills: [], status: 'OPEN', applicationCount: 7,
  viewerHasApplied: false, aiStatus: 'DONE', createdAt: `2026-11-${String(id).padStart(2, '0')}T00:00:00Z`,
  pipeline: { APPLIED: 0, REVIEWING: 0, INTERVIEWING: 0, OFFERED: 0, HIRED: 0 }, ...change,
})
const page = (posts: HiringPost[], query = '') => {
  search = query
  const client = new QueryClient()
  const body = (list: HiringPost[]) => ({ message: '', content: { data: list, totalRow: list.length, totalPages: 1, pageIndex: 1, pageSize: 100 } })
  client.setQueryData(queryKeys.myHiringPosts(myPostsRequest('')), body(posts))
  return renderToStaticMarkup(<QueryClientProvider client={client}><MyHiringPostsPage /></QueryClientProvider>)
}
const six = [1, 2, 3, 4, 5].map((id) => post(id)).concat(post(6, { status: 'CLOSED', applicationCount: 2 }))

describe('my hiring posts page', () => {
  it('shows the hero with New hiring post and one stats line', () => {
    const html = page(six)
    expect(html).toContain('My hiring posts</h1>')
    expect(html).toContain('5 open · 1 closed · 37 applicants')
    expect(html).toContain('New hiring post')
    expect(html).toContain('role="search"')
  })

  it('counts each status in the filter column and lists the newest post first', () => {
    const html = page(six)
    expect(html).toMatch(/All posts<\/span><span[^>]*>6</)
    expect(html).toMatch(/Open<\/span><span[^>]*>5</)
    expect(html).toMatch(/Closed<\/span><span[^>]*>1</)
    expect(html).toContain('6 posts')
    expect(html.indexOf('Role 6')).toBeLessThan(html.indexOf('Role 1'))
  })

  it('keeps only closed posts with ?status=closed', () => {
    const html = page(six, 'status=closed')
    expect(html).toContain('1 closed post')
    expect(html).toContain('Role 6')
    expect(html).not.toContain('Role 1<')
  })

  it('shows the empty state with New hiring post when there are no posts', () => {
    const html = page([])
    expect(html).toContain('No hiring posts yet')
    expect(html.split('New hiring post').length - 1).toBe(2)
  })
})
