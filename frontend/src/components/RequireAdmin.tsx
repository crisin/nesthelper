import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

/**
 * Cosmetic gate — the real check runs in the backend's AdminGuard. This just
 * keeps non-admins from staring at an empty page full of 403s.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role)
  return role === 'ADMIN' ? <>{children}</> : <Navigate to="/dashboard" replace />
}
