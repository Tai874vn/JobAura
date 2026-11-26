import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button } from '../button'

describe('Button pending feedback', () => {
  it('prevents repeat submissions while retaining the action name', () => {
    const html = renderToStaticMarkup(<Button loading type="submit">Save changes</Button>)

    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Save changes')
    expect(html).not.toContain('loading="')
  })

  it('preserves an icon-only action label while pending', () => {
    const html = renderToStaticMarkup(<Button loading size="icon" aria-label="Send comment">→</Button>)

    expect(html).toContain('aria-label="Send comment"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('aria-hidden="true"')
  })

  it('keeps caller-provided disabled and busy states', () => {
    const html = renderToStaticMarkup(<Button disabled aria-busy>Sign in</Button>)

    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('>Sign in</button>')
  })
})
