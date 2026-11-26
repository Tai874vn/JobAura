import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Job } from '@/shared/schemas'
import { JobResultCard } from '../job-result-card'

const sampleJob = (overrides: Partial<Job> = {}): Job => ({
  id: 42,
  title: 'Checkout redesign for an online store',
  price: 1250,
  shortDescription: 'End-to-end UX audit and responsive checkout screens.',
  description: 'Full description.',
  creatorId: 10,
  reviews: 6,
  rating: 4.8,
  workMode: 'ONSITE',
  serviceArea: 'Hanoi',
  subcategory: {
    id: 11,
    name: 'Product Design',
    categoryId: 1,
    category: { id: 1, name: 'Design' },
  },
  user: { id: 10, name: 'Minh Nguyen', avatar: null },
  ...overrides,
})

describe('JobResultCard', () => {
  it('renders priced service details and actions for a signed-in non-owner', () => {
    const html = renderToStaticMarkup(
      <JobResultCard job={sampleJob()} viewer={{ id: 99, role: 'employer' }} />,
    )

    expect(html).toContain('href="/profile/10"')
    expect(html).toContain('href="/jobs/42"')
    expect(html).toContain('Checkout redesign for an online store')
    expect(html).toContain('Minh Nguyen')
    expect(html).toContain('Design')
    expect(html).toContain('Product Design')
    expect(html).toContain('End-to-end UX audit and responsive checkout screens.')
    expect(html).toContain('From 1,250 credits')
    expect(html).not.toContain('$')
    expect(html).toContain('Onsite in Hanoi')
    expect(html).toContain('4.8')
    expect(html).toContain('6 reviews')
    expect(html).toContain('>View</a>')
    expect(html).toContain('Message')
    expect(html).toContain('Send a proposal')
    expect(html).not.toContain('href="/jobs/42/edit"')
  })

  it('renders a portfolio post (price 0) without work mode or Send a proposal', () => {
    const html = renderToStaticMarkup(
      <JobResultCard
        job={sampleJob({ price: 0, reviews: 0, rating: 0 })}
        viewer={{ id: 99, role: 'employer' }}
      />,
    )

    expect(html).toContain('>Portfolio</span>')
    expect(html).not.toContain('Onsite in Hanoi')
    expect(html).toContain('No reviews yet')
    expect(html).toContain('Message')
    expect(html).not.toContain('Send a proposal')
  })

  it('shows Edit and hides Send a proposal and Message for the owner', () => {
    const html = renderToStaticMarkup(
      <JobResultCard job={sampleJob()} viewer={{ id: 10, role: 'user' }} />,
    )

    expect(html).toContain('href="/jobs/42/edit"')
    expect(html).toContain('Edit')
    expect(html).not.toContain('Send a proposal')
    expect(html).not.toContain('Message')
  })

  it('hides Send a proposal and sends Message to sign-in for a signed-out visitor', () => {
    const html = renderToStaticMarkup(
      <JobResultCard job={sampleJob()} viewer={null} />,
    )

    expect(html).toContain('href="/auth/login?next=%2Fjobs%2F42"')
    expect(html).not.toContain('Send a proposal')
    expect(html).not.toContain('Edit')
  })
})
