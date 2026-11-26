import { describe, expect, it } from 'vitest'
import { buildPageMetadata, defaultShareImage } from '../seo'

describe('buildPageMetadata', () => {
  it('fills the title, canonical URL, Open Graph and Twitter card for a public page', () => {
    const metadata = buildPageMetadata({ title: 'Hiring posts', description: 'Open roles.', canonical: '/hiring-posts' })

    expect(metadata.title).toBe('Hiring posts')
    expect(metadata.description).toBe('Open roles.')
    expect(metadata.alternates).toEqual({ canonical: '/hiring-posts' })
    expect(metadata.openGraph).toEqual({
      title: 'Hiring posts | JobAura',
      description: 'Open roles.',
      url: '/hiring-posts',
      siteName: 'JobAura',
      type: 'website',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: defaultShareImage.alt }],
    })
    expect(metadata.twitter).toEqual({
      card: 'summary_large_image',
      title: 'Hiring posts | JobAura',
      description: 'Open roles.',
      images: ['/opengraph-image'],
    })
  })

  it('sets no robots rule unless one is given', () => {
    expect(buildPageMetadata({ title: 'Jobs', description: 'x', canonical: '/jobs' })).not.toHaveProperty('robots')
  })

  it('uses a given picture, page type and robots rule', () => {
    const metadata = buildPageMetadata({
      title: 'Ann',
      description: 'x',
      canonical: '/profile/1',
      type: 'profile',
      image: 'https://cdn.example.com/a.png',
      robots: { index: false },
    })

    expect(metadata.openGraph).toMatchObject({ type: 'profile', images: [{ url: 'https://cdn.example.com/a.png', alt: 'Ann' }] })
    expect(metadata.twitter).toMatchObject({ images: ['https://cdn.example.com/a.png'] })
    expect(metadata.robots).toEqual({ index: false })
  })
})
