import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HiringPost, Job, UserProfile } from '@/shared/schemas'
import {
  hiringPostsItemListJsonLd,
  jobPostingJsonLd,
  jobsItemListJsonLd,
  personJsonLd,
  schemaEmploymentType,
  serviceJsonLd,
} from './seo-jsonld'

const post = (overrides: Partial<HiringPost> = {}) =>
  ({
    id: 42,
    recruiterId: 9,
    title: 'Backend engineer',
    description: 'Build APIs.',
    location: 'Ho Chi Minh City',
    employmentType: 'FULL_TIME',
    salaryMin: 2000,
    salaryMax: 3500,
    salaryCurrency: 'usd',
    salaryPeriod: 'month',
    companyName: 'JobAura Labs',
    skills: ['NestJS', 'PostgreSQL'],
    closesAt: '2026-12-31',
    status: 'OPEN',
    createdAt: '2026-11-20T00:00:00.000Z',
    ...overrides,
  }) as HiringPost

const job = (overrides: Partial<Job> = {}) =>
  ({
    id: 5,
    title: 'Logo design',
    description: 'Clean logos.',
    price: 1250,
    rating: 4.5,
    reviews: 2,
    image: 'https://cdn.example.com/logo.png',
    workMode: 'REMOTE',
    ...overrides,
  }) as Job

/** Every key anywhere in a JSON-LD object, to prove private fields never leak. */
function allKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, inner]) => [key, ...allKeys(inner)])
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://jobaura.example')
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('schemaEmploymentType', () => {
  it('maps form labels and backend codes to schema.org values', () => {
    expect(schemaEmploymentType('Full-time')).toBe('FULL_TIME')
    expect(schemaEmploymentType('FULL_TIME')).toBe('FULL_TIME')
    expect(schemaEmploymentType('Freelance')).toBe('CONTRACTOR')
    expect(schemaEmploymentType('Internship')).toBe('INTERN')
    expect(schemaEmploymentType('Something else')).toBe('OTHER')
    expect(schemaEmploymentType('')).toBeUndefined()
    expect(schemaEmploymentType(null)).toBeUndefined()
  })
})

describe('jobPostingJsonLd', () => {
  it('describes an open post as a valid JobPosting', () => {
    const data = jobPostingJsonLd(post(), new Date('2026-11-25T00:00:00.000Z'))!

    expect(data['@type']).toBe('JobPosting')
    expect(data.url).toBe('https://jobaura.example/hiring-posts/42')
    expect(data.datePosted).toBe('2026-11-20T00:00:00.000Z')
    expect(data.validThrough).toBe('2026-12-31')
    expect(data.employmentType).toBe('FULL_TIME')
    expect(data.hiringOrganization).toEqual({ '@type': 'Organization', name: 'JobAura Labs' })
    expect(data.jobLocation).toEqual({ '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Ho Chi Minh City' } })
    expect(data.jobLocationType).toBeUndefined()
    expect(data.baseSalary).toEqual({
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: { '@type': 'QuantitativeValue', minValue: 2000, maxValue: 3500, unitText: 'MONTH' },
    })
  })

  it('gives nothing for a closed post', () => {
    expect(jobPostingJsonLd(post({ status: 'CLOSED' }))).toBeNull()
  })

  it('gives nothing once the closing day is over, but keeps the post on its last day', () => {
    expect(jobPostingJsonLd(post({ closesAt: '2026-12-31' }), new Date('2026-12-31T20:00:00.000Z'))).not.toBeNull()
    expect(jobPostingJsonLd(post({ closesAt: '2026-12-31' }), new Date('2027-01-01T00:00:01.000Z'))).toBeNull()
    expect(jobPostingJsonLd(post({ closesAt: '2026-12-01T10:00:00.000Z' }), new Date('2026-12-01T11:00:00.000Z'))).toBeNull()
  })

  it('marks remote work and leaves out an empty salary', () => {
    const data = jobPostingJsonLd(post({ location: 'Remote', salaryMin: null, salaryMax: null, closesAt: null }))!

    expect(data.jobLocationType).toBe('TELECOMMUTE')
    expect(data.jobLocation).toBeUndefined()
    expect(data.baseSalary).toBeUndefined()
  })
})

describe('serviceJsonLd', () => {
  it('describes a priced service in credits, never as a currency price', () => {
    const data = serviceJsonLd(job(), { name: 'Ann', href: '/profile/11' })

    expect(data['@type']).toBe('Service')
    expect(data.provider).toEqual({ '@type': 'Person', name: 'Ann', url: 'https://jobaura.example/profile/11' })
    expect(data.offers).toMatchObject({ '@type': 'Offer', description: 'From 1,250 credits' })
    expect(allKeys(data)).not.toContain('priceCurrency')
    expect(allKeys(data)).not.toContain('price')
    expect(data.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 2, bestRating: 5 })
  })

  it('has no offer for a portfolio post and no rating without reviews', () => {
    const data = serviceJsonLd(job({ price: 0, rating: 0, reviews: 0 }), { name: 'Ann' })

    expect(data.offers).toBeUndefined()
    expect(data.aggregateRating).toBeUndefined()
    expect(data.provider.url).toBeUndefined()
  })

  it('names the service area only for on-site work', () => {
    expect(serviceJsonLd(job({ workMode: 'ONSITE', serviceArea: 'Hanoi' }), { name: 'Ann' }).areaServed).toBe('Hanoi')
    expect(serviceJsonLd(job({ workMode: 'REMOTE', serviceArea: 'Hanoi' }), { name: 'Ann' }).areaServed).toBeUndefined()
  })
})

describe('personJsonLd', () => {
  const user = {
    id: 11,
    name: 'Ann Tran',
    email: 'ann@example.com',
    phone: '0900000000',
    birthDay: '2000-01-01',
    gender: true,
    headline: 'Product designer',
    bio: 'I design apps.',
    location: 'Hanoi',
    website: 'https://ann.example',
    skill: 'Figma, Sketch',
  } as unknown as UserProfile

  it('lists public facts only, with no email, phone or birthday', () => {
    const data = personJsonLd(user, [job(), job({ id: 6, price: 0 })])
    const text = JSON.stringify(data)

    expect(data['@type']).toBe('Person')
    expect(data.url).toBe('https://jobaura.example/profile/11')
    expect(data.jobTitle).toBe('Product designer')
    expect(data.sameAs).toEqual(['https://ann.example/'])
    expect(data.knowsAbout).toEqual(['Figma', 'Sketch'])
    expect(text).not.toContain('ann@example.com')
    expect(text).not.toContain('0900000000')
    expect(text).not.toContain('2000-01-01')
    expect(allKeys(data)).not.toContain('email')
    expect(allKeys(data)).not.toContain('telephone')
  })

  it('offers only priced services, described in credits', () => {
    const data = personJsonLd(user, [job(), job({ id: 6, price: 0 })])

    expect(data.makesOffer).toHaveLength(1)
    expect(data.makesOffer?.[0]).toMatchObject({ description: 'From 1,250 credits', itemOffered: { '@type': 'Service', name: 'Logo design' } })
    expect(allKeys(data)).not.toContain('priceCurrency')
  })
})

describe('item lists', () => {
  it('numbers the list items from 1 with absolute links', () => {
    expect(jobsItemListJsonLd([{ id: 5, title: 'Logo design' }]).itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, url: 'https://jobaura.example/jobs/5', name: 'Logo design' },
    ])
    const roles = hiringPostsItemListJsonLd([{ id: 1, title: 'A' }, { id: 2, title: 'B' }])
    expect(roles.numberOfItems).toBe(2)
    expect(roles.itemListElement[1]).toMatchObject({ position: 2, url: 'https://jobaura.example/hiring-posts/2' })
  })
})
