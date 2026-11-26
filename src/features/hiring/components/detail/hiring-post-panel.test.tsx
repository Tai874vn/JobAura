import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HiringPost } from '@/shared/schemas'
import { HiringPostBody } from './hiring-post-panel'

const samplePost: HiringPost = {
  id: 42,
  recruiterId: 7,
  title: 'Backend Engineer',
  companyName: 'Acme Software',
  description: 'Build reliable APIs.',
  requirements: 'Strong SQL knowledge.',
  skills: ['TypeScript', 'PostgreSQL'],
  status: 'OPEN',
  applicationCount: 0,
  hiredCount: 0,
  viewerHasApplied: false,
}

describe('HiringPostBody', () => {
  it('renders h3 headings by default for panels under an h2 title', () => {
    const html = renderToStaticMarkup(<HiringPostBody post={samplePost} />)
    expect(html).toContain('<h3 id="about-42"')
    expect(html).toContain('<h3 id="skills-42"')
    expect(html).toContain('<h3 id="requirements-42"')
  })

  it('renders h2 headings on the standalone detail page under the h1 title', () => {
    const html = renderToStaticMarkup(<HiringPostBody post={samplePost} headingAs="h2" />)
    expect(html).toContain('<h2 id="about-42"')
    expect(html).toContain('<h2 id="skills-42"')
    expect(html).toContain('<h2 id="requirements-42"')
    expect(html).not.toContain('<h3')
  })
})
