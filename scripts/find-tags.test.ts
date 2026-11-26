import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { collectTags, TAG } from './find-tags.mjs'

describe('@find tags', () => {
  it('reads a JS comment tag and a JSX comment tag', () => {
    expect(TAG.exec('// @find hiring-posts filters location ui [all] — Location group')?.slice(1, 7)).toEqual([
      'hiring-posts', 'filters', 'location', 'ui', 'all', 'Location group',
    ])
    expect(TAG.exec('{/* @find hiring-posts card apply access [candidate,recruiter] */}')?.[5]).toBe('candidate,recruiter')
    expect(TAG.exec('// @find hiring-posts / filters / location / ui [all]')).toBeNull()
    expect(TAG.exec('// @find hiring-posts filters location ui')).toBeNull()
  })

  it('every tag in src follows FIND-TAGS.md', () => {
    const tags = collectTags() as Array<{ file: string; line: number; text: string; problem: string | null }>
    const bad = tags.filter((tag) => tag.problem).map((tag) => `${tag.file}:${tag.line} ${tag.problem}`)
    expect(bad).toEqual([])
  })
})
