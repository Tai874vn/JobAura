import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('application icon', () => {
  it('uses the JobAura brand palette', () => {
    const icon = readFileSync(new URL('./icon.svg', import.meta.url), 'utf8')

    expect(icon).toContain('#006d43')
    expect(icon).toContain('#d2d92d')
    expect(icon).not.toContain('#101828')
  })
})
