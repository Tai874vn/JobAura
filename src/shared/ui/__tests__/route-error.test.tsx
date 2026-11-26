import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

import AppError from '@/app/error'
import GlobalError from '@/app/global-error'
import { RouteError } from '../route-error'

describe('RouteError and AppError', () => {
  it('renders plain recovery copy and never renders error.message or error.digest', () => {
    const error = Object.assign(new Error('PrismaClientKnownRequestError at /api/jobs'), { digest: 'err-123' })
    const html = renderToStaticMarkup(<RouteError error={error} reset={() => {}} />)

    expect(html).toContain('Something went wrong')
    expect(html).toContain('>Try again</button>')
    expect(html).toContain('href="/"')
    expect(html).toContain('Back home')
    expect(html).not.toContain('PrismaClientKnownRequestError')
    expect(html).not.toContain('/api/jobs')
    expect(html).not.toContain('err-123')
    expect(html).not.toContain('Reference:')
  })

  it('error.tsx does not render error.message or error.digest', () => {
    const error = Object.assign(new Error('Secret internal stack detail'), { digest: 'seg-999' })
    const html = renderToStaticMarkup(<AppError error={error} reset={() => {}} />)

    expect(html).toContain('Something went wrong')
    expect(html).not.toContain('Secret internal stack detail')
    expect(html).not.toContain('seg-999')
    expect(html).not.toContain('Reference:')
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
    expect(html).not.toContain('Call failed')
    expect(html).not.toContain('Reference:')
  })
})

describe('GlobalError', () => {
  it('renders branded light-theme recovery HTML without error.message or error.digest', () => {
    const error = Object.assign(new Error('Root crash at https://internal.local'), { digest: 'root-42' })
    const html = renderToStaticMarkup(<GlobalError error={error} reset={() => {}} />)

    expect(html).toContain('<html lang="en">')
    expect(html).toContain('JobAura')
    expect(html).toContain('Something went wrong')
    expect(html).toContain('Try again')
    expect(html).toContain('href="/"')
    expect(html).toContain('Back home')
    expect(html).not.toContain('Root crash')
    expect(html).not.toContain('https://internal.local')
    expect(html).not.toContain('root-42')
    expect(html).not.toContain('Reference:')
  })
})
