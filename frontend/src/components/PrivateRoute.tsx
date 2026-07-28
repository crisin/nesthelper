import { useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import type { User } from '../types'

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const location = useLocation()

  // The user object lives in localStorage, so it goes stale the moment an admin
  // changes a role or resets a password. /auth/me is the source of truth and
  // stays reachable even while the password-change gate is active.
  const { data } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.get<User>('/auth/me').then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  })

  useEffect(() => {
    if (!data) return
    // Every refetch hands back a fresh object; only write when a field really
    // changed, otherwise each window focus re-renders the whole app.
    const current = useAuthStore.getState().user
    const changed =
      !current ||
      (Object.keys(data) as (keyof User)[]).some((key) => current[key] !== data[key])
    if (changed) updateUser(data)
  }, [data, updateUser])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (user?.mustChangePassword && location.pathname !== '/set-password') {
    return <Navigate to="/set-password" replace />
  }

  return <>{children}</>
}
