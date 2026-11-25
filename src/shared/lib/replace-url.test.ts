// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { replaceUrlInPlace } from './replace-url'

describe('replaceUrlInPlace', () => {
  afterEach(() => vi.restoreAllMocks())

  it('changes the address bar with history.replaceState (no Next.js navigation, no new history entry)', () => {
    const spy = vi.spyOn(window.history, 'replaceState')
    const before = window.history.length
    replaceUrlInPlace('/jobs?keyword=design&page=2')
    expect(spy).toHaveBeenCalledWith(null, '', '/jobs?keyword=design&page=2')
    expect(window.location.search).toBe('?keyword=design&page=2')
    expect(window.history.length).toBe(before)
  })
})
