import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

import GlobalError from '@/app/global-error'
import { RouteError } from './route-error'

describe('RouteError', () => {
  it('renders plain recovery copy with a Try again button and a link home', () => {
    const error = Object.assign(new Error('Boom'), { digest: 'err-123' })
    const html = renderToStaticMarkup(<RouteError error={error} reset={() => {}} />)

    expect(html).toContain('Something went wrong')
    expect(html).toContain('>Try again</button>')
    expect(html).toContain('href="/"')
    expect(html).toContain('Back home')
    expect(html).toContain('Reference: err-123')
  })

  it('supports custom titles, descriptions, and full-height centering', () => {
    const html = renderToStaticMarkup(
      <RouteError
        error={new Error('Call failed')}
        reset={() => {}}
        title="Interview call unavailable"
        description="Something went wrong with the call screen."
        fullHeight
      />,
    )

    expect(html).toContain('Interview call unavailable')
    expect(html).toContain('Something went wrong with the call screen.')
    expect(html).toContain('min-h-screen')
    expect(html).not.toContain('Reference:')
  })
})

describe('GlobalError', () => {
  it('renders branded light-theme recovery HTML with Try again and Back home', () => {
    const error = Object.assign(new Error('Root crash'), { digest: 'root-42' })
    const html = renderToStaticMarkup(<GlobalError error={error} reset={() => {}} />)

    expect(html).toContain('<html lang="en">')
    expect(html).toContain('JobAura')
    expect(html).toContain('Something went wrong')
    expect(html).toContain('Try again')
    expect(html).toContain('href="/"')
    expect(html).toContain('Back home')
    expect(html).toContain('Reference: root-42')
  })
})
