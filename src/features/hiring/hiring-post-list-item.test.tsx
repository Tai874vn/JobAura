import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HiringPost } from '@/shared/schemas'
import { Pagination, pageWindow } from '@/shared/ui'
import { formatPostedAgo } from './hiring-post-card'
import { HiringPostListItem } from './hiring-post-list-item'

const post = (change: Partial<HiringPost> = {}): HiringPost => ({
  id: 7, recruiterId: 2, title: 'Senior Test Engineer', description: 'Test the product.', skills: [], status: 'OPEN',
  applicationCount: 8, viewerHasApplied: false, companyName: 'Golden Gate Group', location: 'Da Nang',
  predictedSeniority: 'Senior', employmentType: 'Full-time', salaryMin: 3900, salaryMax: 4300,
  recruiter: { id: 2, name: 'Hoang Son', avatar: null }, ...change,
})
const item = (value: HiringPost, selected = false) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <HiringPostListItem post={value} selected={selected} onSelect={() => undefined} />
    </QueryClientProvider>,
  )

describe('hiring post list item', () => {
  it('links the avatar to the recruiter profile and shows the company initials next to the company name', () => {
    const html = item(post())
    expect(html).toContain('href="/profile/2"')
    expect(html).toContain('GG')
    expect(html).toContain('Golden Gate Group · Da Nang')
  })

  it('keeps the title a real link to the post page and marks the selected post', () => {
    expect(item(post())).toContain('href="/hiring-posts/7"')
    expect(item(post())).not.toContain('aria-current')
    expect(item(post(), true)).toContain('aria-current="true"')
  })

  it('shows the level, salary, applicants, and whether the viewer applied', () => {
    const html = item(post({ viewerHasApplied: true }))
    expect(html).toContain('Senior')
    expect(html).toContain('$3,900 - $4,300/mo')
    expect(html).toContain('8 applicants')
    expect(html).toContain('Applied')
  })
})

describe('formatPostedAgo', () => {
  const now = new Date('2026-11-19T12:00:00Z')
  it('says today, yesterday, days and weeks, then the date', () => {
    expect(formatPostedAgo('2026-11-19T08:00:00Z', now)).toBe('Today')
    expect(formatPostedAgo('2026-11-18T08:00:00Z', now)).toBe('Yesterday')
    expect(formatPostedAgo('2026-11-14T12:00:00Z', now)).toBe('5 days ago')
    expect(formatPostedAgo('2026-10-29T12:00:00Z', now)).toBe('3 weeks ago')
    expect(formatPostedAgo('2026-08-01T12:00:00Z', now)).toBe('Aug 1, 2026')
    expect(formatPostedAgo(undefined, now)).toBe('')
  })
})

describe('pagination', () => {
  it('numbers the first, last and neighbouring pages', () => {
    expect(pageWindow(1, 6)).toEqual([1, 2, 6])
    expect(pageWindow(4, 6)).toEqual([1, 3, 4, 5, 6])
  })

  it('disables previous on the first page and next on the last', () => {
    const disabled = (html: string, label: string) => /disabled=""/.test(html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))![0])
    const first = renderToStaticMarkup(<Pagination page={1} totalPages={3} onPage={() => undefined} />)
    expect(disabled(first, 'Previous page')).toBe(true)
    expect(disabled(first, 'Next page')).toBe(false)
    const last = renderToStaticMarkup(<Pagination page={3} totalPages={3} onPage={() => undefined} />)
    expect(disabled(last, 'Next page')).toBe(true)
    expect(renderToStaticMarkup(<Pagination page={1} totalPages={1} onPage={() => undefined} />)).toBe('')
  })
})
