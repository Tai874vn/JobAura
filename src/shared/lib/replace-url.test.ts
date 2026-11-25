import { afterEach, describe, expect, it, vi } from 'vitest'
import { replaceUrlInPlace } from './replace-url'

describe('replaceUrlInPlace', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('changes the address bar with history.replaceState (no Next.js navigation, no new history entry)', () => {
    const replaceState = vi.fn()
    const pushState = vi.fn()
    vi.stubGlobal('window', { history: { replaceState, pushState } })

    replaceUrlInPlace('/jobs?keyword=design&page=2')

    expect(replaceState).toHaveBeenCalledWith(null, '', '/jobs?keyword=design&page=2')
    expect(pushState).not.toHaveBeenCalled()
  })

  it('does nothing on the server', () => {
    expect(() => replaceUrlInPlace('/jobs')).not.toThrow()
  })
})
