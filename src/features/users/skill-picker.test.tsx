import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { FoundSkill } from '@/shared/api/endpoints/users'
import { SkillLevelSelect, SkillPicker } from './skill-picker'

const render = (element: ReactElement) =>
  renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}>{element}</QueryClientProvider>)

const found = (name: string, matched: string[]): FoundSkill => ({
  id: `onet:${name.toLowerCase()}`, name, kind: 'software', reuse: null, fields: {}, hot: true, matched, count: 1,
})

describe('SkillPicker', () => {
  it('shows chosen skills as removable chips and searches only the dictionary', () => {
    const html = render(<SkillPicker value={['React', 'SQL']} onChange={() => undefined} />)
    expect(html).toContain('aria-label="Remove React"')
    expect(html).toContain('aria-label="Remove SQL"')
    expect(html).toContain('role="combobox"')
  })

  it('offers CV skills for confirmation instead of adding them', () => {
    const html = render(<SkillPicker value={['React']} onChange={() => undefined}
      suggestions={[found('React', ['ReactJS']), found('Docker', ['docker'])]} />)
    // React is already chosen, so only Docker is offered; nothing is added until the user clicks.
    expect(html).toContain('Found in your CV')
    expect(html).toContain('Written as: docker')
    expect(html).not.toContain('Written as: ReactJS')
    expect(html).not.toContain('aria-label="Remove Docker"')
  })

  it('hides the search box when the limit is reached', () => {
    const html = render(<SkillPicker value={['React', 'SQL']} max={2} onChange={() => undefined} />)
    expect(html).not.toContain('role="combobox"')
  })
})

describe('SkillLevelSelect', () => {
  it('maps old free-text levels onto the fixed list and flags unknown ones', () => {
    expect(render(<SkillLevelSelect value="advanced" onChange={() => undefined} />)).toContain('value="Advanced" selected=""')
    expect(render(<SkillLevelSelect value="guru" onChange={() => undefined} />)).toContain('guru (choose from the list)')
  })
})
