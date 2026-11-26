import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Job } from '@/shared/schemas'
import { JobCard } from '../job-card'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const job: Job = { id: 1, title: 'Website design', price: 100, reviews: 0, rating: 0 }

function renderCard(overrides: Partial<Job>, waitForImages?: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderToStaticMarkup(<QueryClientProvider client={client}><JobCard job={{ ...job, ...overrides }} waitForImages={waitForImages} /></QueryClientProvider>)
}

describe('Service card readiness', () => {
  it('keeps a cover-image card busy and non-interactive until its media settles', () => {
    const html = renderCard({ image: 'https://images.unsplash.com/cover.jpg' }, true)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('inert=""')
    expect(html).toContain('Loading service')
    // The real image must stay mounted so it can actually load behind the skeleton.
    expect(html).toContain('alt="Website design"')
  })

  it('also waits for a seller avatar when the cover uses a fallback', () => {
    const html = renderCard({ user: { id: 2, name: 'Ava', avatar: 'https://images.unsplash.com/avatar.jpg' } }, true)
    expect(html).toContain('aria-busy="true"')
  })

  it('immediately exposes a card that has no remote media to load', () => {
    const html = renderCard({ image: null }, true)
    expect(html).not.toContain('aria-busy="true"')
    expect(html).not.toContain('inert=""')
    expect(html).toContain('Website design')
  })

  it('keeps server-rendered landing-page cards usable without JavaScript by default', () => {
    const html = renderCard({ image: 'https://images.unsplash.com/cover.jpg' })
    expect(html).not.toContain('inert=""')
    expect(html).not.toContain('Loading service')
    expect(html).toContain('href="/jobs/1"')
  })
})
