import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff, KeyRound } from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import type { AuthResponse } from '../types'

const MIN_LENGTH = 6

/**
 * Forced first-login step: the account was created by an admin with a
 * temporary password, which is only good for exactly one login.
 */
export default function SetPassword() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [serverErr, setServerErr] = useState('')

  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && next !== confirm
  const canSubmit = next.length >= MIN_LENGTH && next === confirm

  const save = useMutation({
    mutationFn: () =>
      api
        .post<AuthResponse>('/auth/complete-onboarding', { newPassword: next })
        .then((r) => r.data),
    // The change invalidates the current token, so the fresh one from the
    // response has to replace it before anything else fires a request.
    onSuccess: (data) => {
      setAuth(data.user, data.access_token)
      // PrivateRoute keeps /auth/me cached for 30s and writes it back into the
      // store. Without this the stale copy — still carrying
      // mustChangePassword: true — would bounce us straight back here.
      queryClient.setQueryData(['auth-me'], data.user)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setServerErr(err.response?.data?.message ?? 'Das hat nicht geklappt')
    },
  })

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const inputClass = `w-full px-3.5 py-2.5 pr-10 rounded-lg bg-surface-overlay border text-foreground text-sm
    placeholder:text-foreground-subtle
    focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
    transition-colors`

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-flex w-11 h-11 items-center justify-center rounded-2xl bg-accent/12 text-accent mb-3">
            <KeyRound size={20} strokeWidth={1.75} />
          </span>
          <h1 className="text-foreground font-semibold text-lg tracking-tight">
            Neues Passwort festlegen
          </h1>
          <p className="text-foreground-muted text-sm mt-1.5 leading-relaxed">
            Fast geschafft. Dein Start-Passwort galt nur für diesen einen Login —
            such dir jetzt dein eigenes aus.
          </p>
        </div>

        <div className="bg-surface-raised border border-edge rounded-2xl p-6 sm:p-8 shadow-card">
          {user?.email && (
            <div className="mb-5 px-3 py-2 rounded-lg bg-surface border border-edge">
              <p className="text-[11px] text-foreground-subtle mb-0.5">
                Angemeldet als
              </p>
              <p className="text-sm text-foreground truncate">{user.email}</p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (canSubmit) save.mutate()
            }}
            className="flex flex-col gap-4"
          >
            {/* Password managers need a username field in the same form to
                associate the new credential — without it they keep offering
                the temporary password. */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={user?.email ?? ''}
              readOnly
              hidden
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="new-password"
                className="text-sm font-medium text-foreground"
              >
                Neues Passwort
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={show ? 'text' : 'password'}
                  value={next}
                  onChange={(e) => {
                    setNext(e.target.value)
                    setServerErr('')
                  }}
                  required
                  autoFocus
                  autoComplete="new-password"
                  className={`${inputClass} ${tooShort ? 'border-red-500/50' : 'border-edge'}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground-muted transition-colors"
                >
                  {show ? (
                    <EyeOff size={15} strokeWidth={1.75} />
                  ) : (
                    <Eye size={15} strokeWidth={1.75} />
                  )}
                </button>
              </div>
              <p
                className={`text-[11px] ${tooShort ? 'text-red-400' : 'text-foreground-subtle'}`}
              >
                Mindestens {MIN_LENGTH} Zeichen. Sonst keine Regeln — nimm was du
                dir merken kannst.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-foreground"
              >
                Nochmal zur Sicherheit
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={`${inputClass} ${
                    confirm.length === 0
                      ? 'border-edge'
                      : mismatch
                        ? 'border-red-500/50'
                        : 'border-accent/40'
                  }`}
                  placeholder="••••••••"
                />
                {confirm.length > 0 && !mismatch && (
                  <Check
                    size={15}
                    strokeWidth={2.5}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-accent"
                  />
                )}
              </div>
              {mismatch && (
                <p className="text-[11px] text-red-400">
                  Die beiden stimmen noch nicht überein
                </p>
              )}
            </div>

            {serverErr && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-500/8 rounded-lg px-3 py-2 text-center">
                {serverErr}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || save.isPending}
              className="mt-1 py-2.5 rounded-lg bg-accent text-black font-semibold text-sm
                         hover:opacity-90 active:scale-[0.98] disabled:opacity-40
                         disabled:cursor-not-allowed transition-all"
            >
              {save.isPending ? 'Wird gespeichert…' : 'Passwort speichern & los'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-foreground-muted">
          Nicht dein Account?{' '}
          <button
            onClick={handleLogout}
            className="text-foreground font-medium hover:text-accent transition-colors"
          >
            Abmelden
          </button>
        </p>
      </div>
    </div>
  )
}
