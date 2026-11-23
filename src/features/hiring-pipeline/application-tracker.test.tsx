import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ApplicationTracker } from './application-tracker'
import { OfferCard } from './offer-card'

describe('ApplicationTracker', () => {
  it('draws the five steps, with the current one marked', () => {
    const html = renderToStaticMarkup(<ApplicationTracker application={{ status: 'REVIEWING', events: [] }} />)
    for (const label of ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired']) expect(html).toContain(label)
    expect(html.match(/aria-current="step"/g)).toHaveLength(1)
  })

  it('shows Hired in green with all steps done', () => {
    const html = renderToStaticMarkup(<ApplicationTracker application={{ status: 'HIRED', events: [] }} />)
    expect(html.match(/data-state="done"/g)).toHaveLength(5)
    expect(html).toContain('You are hired')
  })

  it('greys the steps of a swept application and says Position filled', () => {
    const html = renderToStaticMarkup(
      <ApplicationTracker
        application={{ status: 'REJECTED', statusReason: 'POSITION_FILLED', events: [{ id: 1, type: 'shortlisted', createdAt: '2026-11-12T10:00:00' }] }}
      />,
    )
    expect(html.match(/data-state="stopped"/g)).toHaveLength(2)
    expect(html).toContain('Not selected · Position filled')
    expect(html).not.toContain('aria-current="step"')
  })
})

describe('OfferCard', () => {
  const props = { company: 'Harbor Health', onAccept: () => {}, onDecline: () => {} }

  it('shows the note and both buttons while the offer stands', () => {
    const html = renderToStaticMarkup(<OfferCard {...props} application={{ status: 'OFFERED', offerNote: 'Start on 1 Dec.' }} />)
    expect(html).toContain('Start on 1 Dec.')
    expect(html).toContain('Accept offer')
    expect(html).toContain('Decline')
  })

  it.each(['INTERVIEWING', 'HIRED', 'DECLINED', 'WITHDRAWN', 'REJECTED'] as const)('hides everything once the status is %s', (status) => {
    const html = renderToStaticMarkup(<OfferCard {...props} application={{ status, offerNote: 'Start on 1 Dec.' }} />)
    expect(html).toBe('')
  })
})
