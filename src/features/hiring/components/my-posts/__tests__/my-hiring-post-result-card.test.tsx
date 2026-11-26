import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HiringPost } from '@/shared/schemas'
import { MyHiringPostResultCard } from '../my-hiring-post-result-card'

const post = (change: Partial<HiringPost> = {}): HiringPost => ({
  id: 7, recruiterId: 2, title: 'Senior Test Engineer', description: 'Test the product.', skills: [], status: 'OPEN',
  applicationCount: 5, viewerHasApplied: false, location: 'Da Nang', predictedSeniority: 'Senior', employmentType: 'Full-time',
  salaryMin: 3900, salaryMax: 4300, openings: 2, hiredCount: 1, aiStatus: 'DONE',
  pipeline: { APPLIED: 3, REVIEWING: 0, INTERVIEWING: 1, OFFERED: 0, HIRED: 1 }, ...change,
})
const card = (value: HiringPost, expanded = false) => renderToStaticMarkup(
  <QueryClientProvider client={new QueryClient()}>
    <MyHiringPostResultCard post={value} defaultExpanded={expanded} onEdit={() => undefined} onToggleStatus={() => undefined}
      statusPending={false} onPredict={() => undefined} predictPending={false} predictDisabled={false} />
  </QueryClientProvider>,
)

describe('my hiring post result card', () => {
  it('shows the title link, the status, the facts and the pipeline line', () => {
    const html = card(post())
    expect(html).toContain('href="/hiring-posts/7"')
    expect(html).toContain('>Open</span>')
    expect(html).toContain('AI level: Senior')
    expect(html).toContain('Da Nang')
    expect(html).toContain('$3,900 - $4,300/mo')
    expect(html).toContain('3 new · 1 interview · 1 of 2 filled')
    expect(html).toContain('5 applicants')
  })

  it('has Applicants with its count, Edit, Close and Open post on an open post', () => {
    const html = card(post())
    expect(html).toContain('href="/my-hiring-posts/7/applicants"')
    expect(html).toMatch(/Applicants <span class="tabular-nums">\(5\)<\/span>/)
    expect(html).toContain('Edit')
    expect(html).toContain('Close')
    expect(html).not.toContain('Reopen')
    expect(html).toContain('Open post')
  })

  it('offers Reopen on a closed post', () => {
    const html = card(post({ status: 'CLOSED' }))
    expect(html).toContain('>Closed</span>')
    expect(html).toContain('Reopen')
  })

  it('keeps the step chips folded until Applicants by step is opened, then links each step', () => {
    expect(card(post())).toContain('aria-expanded="false"')
    expect(card(post())).not.toContain('applicants?status=')
    const html = card(post(), true)
    expect(html).toContain('aria-expanded="true"')
    for (const status of ['APPLIED', 'REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED']) {
      expect(html).toContain(`href="/my-hiring-posts/7/applicants?status=${status}"`)
    }
    expect(html).toContain('Latest applicants')
    expect(html).toContain('href="/recommendations/candidates?hiringPostId=7"')
  })
})
