import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppliedActionView, applicationForPost } from './applied-action'

const rows = [
  { id: 11, hiringPostId: 4, status: 'INTERVIEWING' as const, statusReason: null },
  { id: 12, hiringPostId: 5, status: 'REJECTED' as const, statusReason: 'POSITION_FILLED' as const },
]

describe('applicationForPost', () => {
  it('finds the application of that post, or null', () => {
    expect(applicationForPost(rows, 5)?.id).toBe(12)
    expect(applicationForPost(rows, 9)).toBeNull()
    expect(applicationForPost(undefined, 4)).toBeNull()
  })
})

describe('AppliedActionView', () => {
  it('shows the status and links to that application', () => {
    const html = renderToStaticMarkup(<AppliedActionView application={rows[0]} />)
    expect(html).toContain('Interview')
    expect(html).toContain('View my application')
    expect(html).toContain('href="/my-applications?application=11"')
    expect(html).not.toContain('Applied')
  })

  it('shows a swept application as Position filled', () => {
    expect(renderToStaticMarkup(<AppliedActionView application={rows[1]} />)).toContain('Position filled')
  })

  it('still offers the link while the application is loading', () => {
    const html = renderToStaticMarkup(<AppliedActionView application={null} />)
    expect(html).toContain('href="/my-applications"')
    expect(html).toContain('View my application')
  })
})
