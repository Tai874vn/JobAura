import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ApplicationEvent } from '@/shared/schemas'
import { ApplicationTimeline } from '../application-timeline'

const event = (id: number, type: string, data: ApplicationEvent['data'] = null, actor: ApplicationEvent['actor'] = null) =>
  ({ id, type, data, createdAt: '2026-11-21T01:00:00.000Z', actor }) as ApplicationEvent

describe('ApplicationTimeline', () => {
  it('renders the events in the order they are given', () => {
    const html = renderToStaticMarkup(
      <ApplicationTimeline events={[event(1, 'applied'), event(2, 'shortlisted'), event(3, 'offer_sent', { note: 'Welcome' })]} />,
    )
    expect(html.indexOf('Applied')).toBeGreaterThan(-1)
    expect(html.indexOf('Applied')).toBeLessThan(html.indexOf('Shortlisted'))
    expect(html.indexOf('Shortlisted')).toBeLessThan(html.indexOf('Offer sent'))
    expect(html).toContain('Welcome')
  })

  it('says why a sweep rejected the application', () => {
    const html = renderToStaticMarkup(<ApplicationTimeline events={[event(1, 'rejected', { reason: 'POSITION_FILLED' })]} />)
    expect(html).toContain('Position filled')
  })

  it('shows a new backend type as readable text instead of failing', () => {
    expect(renderToStaticMarkup(<ApplicationTimeline events={[event(1, 'some_new_type')]} />)).toContain('Some new type')
  })

  it('says so when there is no history', () => {
    expect(renderToStaticMarkup(<ApplicationTimeline events={[]} />)).toContain('No history yet')
  })
})
