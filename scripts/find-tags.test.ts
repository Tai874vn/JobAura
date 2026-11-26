import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { collectTags, TAG } from './find-tags.mjs'

describe('@find tags', () => {
  it('reads a JS comment tag and a JSX comment tag', () => {
    expect(TAG.exec('// @find [all] hiring-posts / filters / location / ui — Location group')?.slice(1, 7)).toEqual([
      'all', 'hiring-posts', 'filters', 'location', 'ui', 'Location group',
    ])
    expect(TAG.exec('{/* @find [candidate,recruiter] hiring-posts / card / apply / access */}')?.[1]).toBe('candidate,recruiter')
    expect(TAG.exec('// @find all hiring-posts filters location ui')).toBeNull()
  })

  it('every tag in src follows FIND-TAGS.md', () => {
    const tags = collectTags() as Array<{ file: string; line: number; text: string; problem: string | null }>
    const bad = tags.filter((tag) => tag.problem).map((tag) => `${tag.file}:${tag.line} ${tag.problem}`)
    expect(bad).toEqual([])
  })
})
