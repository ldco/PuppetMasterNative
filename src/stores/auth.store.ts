import { create } from 'zustand'

import type { AuthUser } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isHydrating: boolean
  setHydrating: (isHydrating: boolean) => void
  setSession: (user: AuthUser, token: string) => void
  setUser: (user: AuthUser | null) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrating: true,
  setHydrating: (isHydrating) => {
    set({ isHydrating })
  },
  setSession: (user, token) => {
    set({ user, token, isHydrating: false })
  },
  setUser: (user) => {
    set((state) => ({ ...state, user, isHydrating: false }))
  },
  clearSession: () => {
    set({ user: null, token: null, isHydrating: false })
  }
}))
