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

  const inputClass = `w-full px-3.5 py-2.5 rounded-lg bg-surface-overlay border border-edge text-foreground text-sm
    placeholder:text-foreground-subtle
    focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
    transition-colors`

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-accent font-bold text-xl tracking-tight">Lyrics Helper</span>
          <p className="text-foreground-muted text-sm mt-1.5">Sign in to your account</p>
        </div>

        <div className="bg-surface-raised border border-edge rounded-2xl p-8 shadow-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-500/8 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-2.5 rounded-lg bg-accent text-black font-semibold text-sm
                         hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-foreground-muted">
          kein account?{' '}
          <Link to="/login" className="text-foreground font-medium hover:text-accent transition-colors">
            nur für coole kids, sorry
          </Link>
        </p>
      </div>
    </div>
  )
}
