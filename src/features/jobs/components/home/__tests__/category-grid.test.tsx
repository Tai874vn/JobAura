import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverRequest } from '@/shared/api/server'
import { CategoryGrid } from '../category-grid'

vi.mock('@/shared/api/server', () => ({
  serverRequest: vi.fn(),
}))

describe('CategoryGrid', () => {
  beforeEach(() => {
    vi.mocked(serverRequest).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      error: 'Unavailable',
    })
  })

  it('uses keyword searches instead of invented category IDs when the API is unavailable', async () => {
    const html = renderToStaticMarkup(await CategoryGrid())

    expect(html).toContain('href="/jobs?keyword=Design"')
    expect(html).toContain('href="/jobs?keyword=Development"')
    expect(html).not.toContain('href="/jobs?category=1"')
  })
})
