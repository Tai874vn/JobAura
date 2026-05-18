import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth-store'

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle', hasHydrated: false })
  })

  it('sets authenticated status when user exists', () => {
    useAuthStore.getState().setUser({ id: 1, name: 'Jane', email: 'jane@example.com' })
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.id).toBe(1)
  })

  it('sets anonymous status when user is removed', () => {
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('clears session and tracks hydration state', () => {
    useAuthStore.getState().setUser({ id: 2, name: 'John', email: 'john@example.com' })
    useAuthStore.getState().setHasHydrated(true)
    useAuthStore.getState().clearSession()

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      status: 'anonymous',
      hasHydrated: true,
    })
  })
})
