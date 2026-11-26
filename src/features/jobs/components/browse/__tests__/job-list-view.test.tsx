import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import { JobListView } from '../job-list-view'
import { readJobListFilters, toJobSearchParams } from '../../../utils/jobs-browse-view'

const navigation = vi.hoisted(() => ({ search: '', replace: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/jobs',
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

function renderList(categoryNames: string[], loaded = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(queryKeys.categories, {
    content: categoryNames.map((name, index) => ({ id: index + 1, name, subcategories: [] })),
  })
  const parsed = readJobListFilters(new URLSearchParams(navigation.search))
  const { page, ...filters } = parsed
  if (loaded) {
    client.setQueryData(queryKeys.jobs(toJobSearchParams(filters, page)), {
      content: { data: [], totalRow: 0, totalPages: 1 },
    })
  }
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <JobListView />
    </QueryClientProvider>,
  )
}

describe('Portfolio list feedback', () => {
  beforeEach(() => {
    navigation.search = ''
  })

  it('renders the BrowsePage hero, popular Explore chips and credit price filters', () => {
    const html = renderList(['Design', 'Development'])
    expect(html).toContain('Candidate portfolios')
    expect(html).toContain('Software Engineer')
    expect(html).toContain('Data Analyst')
    expect(html).toContain('Product Designer')
    expect(html).toContain('Portfolio posts')
    expect(html).toContain('Up to 500 credits')
    expect(html).not.toContain('$')
  })

  it('collapses a long category list behind an accessible expansion control', () => {
    const html = renderList(Array.from({ length: 12 }, (_, index) => `Specialty ${index + 1}`))
    expect(html).toContain('Show more')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('Specialty 12')
  })

  it('keeps a selected category visible even outside the collapsed list', () => {
    navigation.search = 'category=12'
    const html = renderList(Array.from({ length: 12 }, (_, index) => `Specialty ${index + 1}`))
    expect(html).toContain('Specialty 12')
    expect(html).not.toContain('Specialty 11')
  })

  it('does not offer expansion for a short category list', () => {
    const html = renderList(['Design', 'Development'])
    expect(html).toContain('Design')
    expect(html).not.toContain('Show more')
  })

  it('announces initial loading instead of presenting an empty result', () => {
    const html = renderList([], false)
    expect(html).toContain('Loading portfolio posts')
    expect(html).not.toContain('No portfolio posts match')
  })
})
