import { describe, expect, it } from 'vitest'
import { initialFocusIndex, isTopmostDialog, nextFocusIndex } from './dialog-focus'

describe('nextFocusIndex', () => {
  it('moves forward and wraps from the last to the first', () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1)
    expect(nextFocusIndex(2, 3, false)).toBe(0)
  })

  it('moves backward and wraps from the first to the last', () => {
    expect(nextFocusIndex(1, 3, true)).toBe(0)
    expect(nextFocusIndex(0, 3, true)).toBe(2)
  })

  it('brings focus back inside when it is outside the dialog', () => {
    expect(nextFocusIndex(-1, 3, false)).toBe(0)
    expect(nextFocusIndex(-1, 3, true)).toBe(2)
  })

  it('returns -1 when nothing can take focus', () => {
    expect(nextFocusIndex(-1, 0, false)).toBe(-1)
  })
})

describe('initialFocusIndex', () => {
  it('picks the first form field', () => {
    expect(initialFocusIndex([{ tagName: 'BUTTON' }, { tagName: 'TEXTAREA' }, { tagName: 'INPUT', type: 'text' }])).toBe(1)
  })

  it('skips file pickers', () => {
    expect(initialFocusIndex([{ tagName: 'INPUT', type: 'file' }, { tagName: 'BUTTON', cancel: true }])).toBe(1)
  })

  it('falls back to Cancel when there is no field', () => {
    expect(initialFocusIndex([{ tagName: 'BUTTON' }, { tagName: 'BUTTON', cancel: true }, { tagName: 'BUTTON' }])).toBe(1)
  })

  it('returns -1 when there is neither a field nor Cancel', () => {
    expect(initialFocusIndex([{ tagName: 'BUTTON' }])).toBe(-1)
  })
})

describe('isTopmostDialog', () => {
  it('returns true only for the last dialog in the stack', () => {
    const discussion = { id: 'discussion' }
    const confirm = { id: 'confirm' }
    expect(isTopmostDialog([], discussion)).toBe(false)
    expect(isTopmostDialog([discussion], discussion)).toBe(true)
    expect(isTopmostDialog([discussion, confirm], discussion)).toBe(false)
    expect(isTopmostDialog([discussion, confirm], confirm)).toBe(true)
  })
})
