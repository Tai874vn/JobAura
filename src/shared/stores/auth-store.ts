'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '@/shared/schemas'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

interface AuthState {
  user: UserProfile | null
  status: AuthStatus
  hasHydrated: boolean
  setUser: (user: UserProfile | null) => void
  setStatus: (status: AuthStatus) => void
  clearSession: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      status: 'idle',
      hasHydrated: false,
      setUser: (user) => set({ user, status: user ? 'authenticated' : 'anonymous' }),
      setStatus: (status) => set({ status }),
      clearSession: () => set({ user: null, status: 'anonymous' }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'jobaura-auth',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setStatus(state.user ? 'authenticated' : 'anonymous')
        state?.setHasHydrated(true)
      },
    }
  )
)
