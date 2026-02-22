import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import type { AuthResponse } from '../types'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  if (isAuthenticated) {
    navigate('/dashboard')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
      setAuth(data.user, data.access_token)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message
      setError(msg ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
      <div className="max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-spotify-green font-bold text-xl tracking-tight">Lyrics Helper</span>
          <p className="text-app-muted text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-app-card border border-app-edge rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-app-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="px-3.5 py-2.5 rounded-lg bg-app-input border border-app-edge text-app-ink text-sm
                           placeholder:text-app-faint
                           focus:outline-none focus:ring-2 focus:ring-spotify-green/40 focus:border-spotify-green
                           transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-app-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="px-3.5 py-2.5 rounded-lg bg-app-input border border-app-edge text-app-ink text-sm
                           placeholder:text-app-faint
                           focus:outline-none focus:ring-2 focus:ring-spotify-green/40 focus:border-spotify-green
                           transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-2.5 rounded-lg bg-spotify-green text-black font-semibold text-sm
                         hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-app-muted">
          No account?{' '}
          <Link to="/register" className="text-app-ink font-medium hover:text-spotify-green transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
