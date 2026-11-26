import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppliedAction } from '../applied-action'

describe('AppliedAction', () => {
  it('shows the status and links to that application', () => {
    const html = renderToStaticMarkup(<AppliedAction application={{ id: 11, status: 'INTERVIEWING', statusReason: null }} />)
    expect(html).toContain('Interview')
    expect(html).toContain('View my application')
    expect(html).toContain('href="/my-applications?application=11"')
    expect(html).not.toContain('Applied')
  })

  it('shows a swept application as Position filled', () => {
    expect(renderToStaticMarkup(<AppliedAction application={{ id: 12, status: 'REJECTED', statusReason: 'POSITION_FILLED' }} />)).toContain('Position filled')
  })

  it('still offers the link when the card has no application', () => {
    expect(renderToStaticMarkup(<AppliedAction application={null} />)).toContain('href="/my-applications"')
  })
})
