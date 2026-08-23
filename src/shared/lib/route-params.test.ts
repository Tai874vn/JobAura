import { describe, expect, it } from 'vitest'
import { positiveIntegerRouteParam } from './route-params'

describe('positiveIntegerRouteParam', () => {
  it('accepts positive safe integer identifiers', () => {
    expect(positiveIntegerRouteParam('1')).toBe(1)
    expect(positiveIntegerRouteParam('874')).toBe(874)
  })

  it('rejects malformed, ambiguous, and unsafe identifiers', () => {
    expect(positiveIntegerRouteParam('0')).toBeNull()
    expect(positiveIntegerRouteParam('-1')).toBeNull()
    expect(positiveIntegerRouteParam('1.5')).toBeNull()
    expect(positiveIntegerRouteParam('1/path')).toBeNull()
    expect(positiveIntegerRouteParam('9007199254740992')).toBeNull()
  })
})
