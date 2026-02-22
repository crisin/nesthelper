import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import type { AuthResponse } from '../types'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [name, setName]         = useState('')
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
      const { data } = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
        ...(name.trim() ? { name: name.trim() } : {}),
      })
      setAuth(data.user, data.access_token)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const field = 'px-3.5 py-2.5 rounded-lg bg-app-input border border-app-edge text-app-ink text-sm placeholder:text-app-faint focus:outline-none focus:ring-2 focus:ring-spotify-green/40 focus:border-spotify-green transition-colors'

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-spotify-green font-bold text-xl tracking-tight">Lyrics Helper</span>
          <p className="text-app-muted text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-app-card border border-app-edge rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-app-ink">
                Name <span className="text-app-faint font-normal">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={field}
                placeholder="Your name"
              />
            </div>

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
                className={field}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-app-ink">
                Password <span className="text-app-faint font-normal">(min 8 chars)</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={field}
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-app-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-app-ink font-medium hover:text-spotify-green transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
