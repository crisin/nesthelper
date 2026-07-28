import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  /** Why the last session ended — shown once on the login page. */
  logoutReason: string | null
  setAuth: (user: User, token: string) => void
  updateUser: (patch: Partial<User>) => void
  clearAuth: (reason?: string) => void
  consumeLogoutReason: () => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      logoutReason: null,
      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true, logoutReason: null }),
      updateUser: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      clearAuth: (reason) =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          logoutReason: reason ?? null,
        }),
      consumeLogoutReason: () => {
        const reason = get().logoutReason
        if (reason) set({ logoutReason: null })
        return reason
      },
    }),
    {
      name: 'auth',
      version: 1,
      // Never persist the logout reason — it belongs to one redirect, not to
      // the next time the browser is opened.
      partialize: ({ user, token, isAuthenticated }) => ({
        user,
        token,
        isAuthenticated,
      }),
      // v0 users predate role/mustChangePassword and would render as non-admins
      // until the first /auth/me lands. Dropping the cached user removes that
      // flash; the token survives, so nobody gets logged out.
      migrate: (state) => ({ ...(state as AuthState), user: null }),
    },
  ),
)
