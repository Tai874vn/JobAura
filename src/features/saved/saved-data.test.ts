import { describe, expect, it } from 'vitest'
import { mergeSavedPages } from './saved-data'

describe('saved page data', () => {
  it('merges cursor pages without duplicate items', () => {
    expect(mergeSavedPages([
      { data: [{ id: 3 }, { id: 2 }], nextCursor: 'a' },
      { data: [{ id: 2 }, { id: 1 }], nextCursor: null },
    ])).toEqual([{ id: 3 }, { id: 2 }, { id: 1 }])
  })
})
