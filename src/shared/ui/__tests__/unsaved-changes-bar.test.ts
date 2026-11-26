import { describe, expect, it } from 'vitest'
import { decideNavigationHold, shouldHoldNavigation } from '../unsaved-changes-bar'

describe('shouldHoldNavigation', () => {
  it('stays armed whenever there are unsaved changes, even on hidden tabs', () => {
    expect(shouldHoldNavigation(true)).toBe(true)
    expect(shouldHoldNavigation(false)).toBe(false)
  })
})

describe('decideNavigationHold', () => {
  it('blocks leaving /settings from another tab and asks the host to reveal the dirty tab', () => {
    expect(
      decideNavigationHold({
        dirty: true,
        active: false,
        targetPathname: '/jobs',
        currentPathname: '/settings',
        sameOrigin: true,
      }),
    ).toEqual({ block: true, revealTab: true })
  })

  it('blocks leaving /settings from the active tab without switching tabs', () => {
    expect(
      decideNavigationHold({
        dirty: true,
        active: true,
        targetPathname: '/jobs',
        currentPathname: '/settings',
        sameOrigin: true,
      }),
    ).toEqual({ block: true, revealTab: false })
  })

  it('allows switching sections within /settings while keeping drafts', () => {
    expect(
      decideNavigationHold({
        dirty: true,
        active: true,
        targetPathname: '/settings',
        currentPathname: '/settings',
        sameOrigin: true,
      }),
    ).toEqual({ block: false, revealTab: false })

    expect(
      decideNavigationHold({
        dirty: true,
        active: false,
        targetPathname: '/settings',
        currentPathname: '/settings',
        sameOrigin: true,
      }),
    ).toEqual({ block: false, revealTab: false })
  })

  it('allows navigation when clean or leaving to another origin', () => {
    expect(
      decideNavigationHold({
        dirty: false,
        active: true,
        targetPathname: '/jobs',
        currentPathname: '/settings',
        sameOrigin: true,
      }),
    ).toEqual({ block: false, revealTab: false })

    expect(
      decideNavigationHold({
        dirty: true,
        active: false,
        targetPathname: '/external',
        currentPathname: '/settings',
        sameOrigin: false,
      }),
    ).toEqual({ block: false, revealTab: false })
  })
})
