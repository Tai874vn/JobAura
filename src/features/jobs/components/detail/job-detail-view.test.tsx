import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Job } from '@/shared/schemas'
import { JobDetailView } from './job-detail-view'

let sessionUser: { id: number; role: string } | null = null
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/use-session', () => ({ useSession: () => ({ user: sessionUser }) }))

const service: Job = {
  id: 7,
  title: 'Logo design',
  price: 1000,
  reviews: 0,
  rating: 0,
  creatorId: 2,
  workMode: 'BOTH',
  serviceArea: 'Hanoi',
  milestoneTemplate: [
    { title: 'Sketch', description: 'Three rough ideas', share: 30 },
    { title: 'Final files', share: 70 },
  ],
}

function render(job: Job) {
  const client = new QueryClient()
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <JobDetailView job={job} comments={[]} />
    </QueryClientProvider>,
  )
}

describe('Service page', () => {
  beforeEach(() => {
    sessionUser = null
  })

  it('shows the price, work mode and split, and proposal buttons to a visitor, with no hire step', () => {
    const html = render(service)
    expect(html).toContain('From 1,000 credits')
    expect(html).toContain('Remote or onsite in Hanoi')
    expect(html).toContain('How the work is usually split')
    expect(html).toContain('Sketch · 30%')
    expect(html).toContain('300 credits')
    expect(html).toContain('Send a proposal')
    expect(html).toContain('Message')
    expect(html).not.toMatch(/hire/i)
    expect(html).not.toContain('$')
    expect(html).not.toContain('Post review')
  })

  it('shows neither button to the owner, but an Edit link', () => {
    sessionUser = { id: 2, role: 'user' }
    const html = render(service)
    expect(html).not.toContain('Send a proposal')
    expect(html).not.toContain('>Message<')
    expect(html).toContain('/jobs/7/edit')
  })

  it('keeps a portfolio post a showcase without a proposal button', () => {
    const html = render({ ...service, price: 0, milestoneTemplate: null })
    expect(html).not.toContain('Send a proposal')
    expect(html).toContain('Message candidate')
  })
})
