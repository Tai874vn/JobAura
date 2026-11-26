import { readFile } from 'node:fs/promises'
import path from 'node:path'
import tailwindcss from '@tailwindcss/postcss'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

describe('globals.css motion utilities (Tailwind v4)', () => {
  it('generates responsive CSS for max-lg and lg motion utilities and obeys the motion rules', async () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css')
    const source = await readFile(cssPath, 'utf8')
    const result = await postcss([tailwindcss()]).process(source, { from: cssPath })
    const compiled = result.css

    // Finding 2: responsive variants of @utility motion classes must actually emit CSS rules.
    expect(compiled).toMatch(/\.max-lg\\:motion-popover\s*\{[\s\S]*?animation:\s*popover-in/)
    expect(compiled).toMatch(/\.max-lg\\:motion-drawer\s*\{[\s\S]*?animation:\s*drawer-in/)
    expect(compiled).toMatch(/\.lg\\:results-in\s*\{[\s\S]*?animation:\s*results-in/)

    // Finding 3: durations stay within 150-250ms, no scale transforms in entrance keyframes, and reduced motion disables animations.
    expect(compiled).toContain('--motion-fast: 160ms')
    expect(compiled).not.toMatch(/@keyframes\s+(menu-drop|panel-in|check-pop)\s*\{[^}]*scale/s)
    expect(compiled).toContain('animation-delay: 0ms !important')
    expect(compiled).toContain('transition-delay: 0ms !important')
    expect(compiled).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?animation:\s*none\s*!important/)
  })
})
