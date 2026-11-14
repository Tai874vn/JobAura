import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import { JobListView } from './job-list-view'

const navigation = vi.hoisted(() => ({ search: '', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

function renderList(categoryNames: string[], loaded = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(queryKeys.categories, { content: categoryNames.map((name, index) => ({ id: index + 1, name: name, subcategories: [] })) })
  if (loaded) client.setQueryData(queryKeys.jobs({ page: 1, pageSize: 12, categoryId: Number(new URLSearchParams(navigation.search).get('category')) || undefined }), { content: { data: [], totalRow: 0, totalPages: 1 } })
  return renderToStaticMarkup(<QueryClientProvider client={client}><JobListView /></QueryClientProvider>)
}

describe('Explore services feedback', () => {
  beforeEach(() => { navigation.search = '' })

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

  it('announces initial service loading instead of presenting an empty result', () => {
    const html = renderList([], false)
    expect(html).toContain('Loading services')
    expect(html).not.toContain('No services found')
  })
})
