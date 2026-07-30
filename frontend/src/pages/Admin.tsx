import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  Check,
  Copy,
  KeyRound,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { useNotify } from '../stores/notificationStore'
import type { AdminUser, ProvisionedUser, Role } from '../types'

const ADMIN_USERS_KEY = ['admin-users']

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'muted' | 'danger'
}) {
  const tones = {
    neutral: 'bg-surface-overlay text-foreground-muted border-edge',
    accent: 'bg-accent/12 text-accent border-accent/30',
    muted: 'bg-transparent text-foreground-subtle border-edge',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

function Dialog({
  title,
  onClose,
  dismissable = true,
  children,
}: {
  title: string
  onClose: () => void
  /** false for show-once content — a stray backdrop tap must not destroy it. */
  dismissable?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismissable ? onClose : undefined}
      />
      <div className="relative w-full sm:max-w-md bg-surface-raised border border-edge rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-edge sticky top-0 bg-surface-raised">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="w-8 h-8 -mr-2 flex items-center justify-center rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-overlay transition-colors"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  tone = 'neutral',
  children,
}: {
  onClick: () => void
  disabled?: boolean
  tone?: 'neutral' | 'danger'
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        tone === 'danger'
          ? 'border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10'
          : 'border-edge text-foreground-muted hover:text-foreground hover:bg-surface-overlay',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function formatDate(value?: string | null): string {
  if (!value) return 'nie'
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

// ─── Credentials dialog ───────────────────────────────────────────────────────

function CredentialsDialog({
  result,
  onClose,
}: {
  result: ProvisionedUser
  onClose: () => void
}) {
  const [copied, setCopied] = useState<'password' | 'message' | null>(null)
  const notify = useNotify()

  const message =
    `Login: ${window.location.origin}\n` +
    `Email: ${result.user.email}\n` +
    `Passwort: ${result.tempPassword}\n\n` +
    `Beim ersten Login suchst du dir direkt ein eigenes Passwort aus.`

  // navigator.clipboard is undefined over plain http on phones, and this
  // password exists in exactly one response body — so there is always a
  // selectable input to fall back to.
  async function copy(text: string, what: 'password' | 'message') {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(what)
        setTimeout(() => setCopied(null), 2000)
        return
      } catch {
        /* falls through to the manual hint */
      }
    }
    notify.error('Kopieren geht hier nicht — tipp ins Feld und kopier von Hand')
  }

  return (
    <Dialog title="Zugangsdaten" onClose={onClose} dismissable={false}>
      <p className="text-sm text-foreground-muted mb-4">
        Für <span className="text-foreground">{result.user.email}</span>. Schick
        das jetzt rüber — danach ist das Passwort nicht mehr einsehbar.
      </p>

      <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-accent/30 focus-within:border-accent/60 transition-colors">
        <input
          readOnly
          value={result.tempPassword}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Temporäres Passwort"
          // text-base keeps iOS from zooming in on focus
          className="flex-1 min-w-0 bg-transparent font-mono text-base text-foreground tracking-wider focus:outline-none"
        />
        <button
          onClick={() => copy(result.tempPassword, 'password')}
          aria-label="Passwort kopieren"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-subtle hover:text-accent hover:bg-surface-overlay transition-colors flex-shrink-0"
        >
          {copied === 'password' ? (
            <Check size={15} strokeWidth={2.5} className="text-accent" />
          ) : (
            <Copy size={15} strokeWidth={1.75} />
          )}
        </button>
      </div>

      <p className="text-[11px] text-foreground-subtle mt-2 mb-5">
        Wird nur dieses eine Mal angezeigt. Falls es verloren geht: einfach
        zurücksetzen.
      </p>

      <div className="space-y-2">
        <button
          onClick={() => copy(message, 'message')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent text-black text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {copied === 'message' ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              Kopiert
            </>
          ) : (
            <>
              <Send size={14} strokeWidth={2} />
              Ganze Nachricht kopieren
            </>
          )}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-edge text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-surface-overlay transition-colors"
        >
          Per WhatsApp schicken
        </a>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg border border-edge text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-surface-overlay transition-colors"
        >
          Fertig
        </button>
      </div>
    </Dialog>
  )
}

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreateUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (result: ProvisionedUser) => void
}) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [makeAdmin, setMakeAdmin] = useState(false)
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: () =>
      api
        .post<ProvisionedUser>('/admin/users', {
          email: email.trim(),
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(makeAdmin ? { role: 'ADMIN' as Role } : {}),
        })
        .then((r) => r.data),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY })
      onCreated(result)
    },
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const message = err.response?.data?.message
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'Anlegen fehlgeschlagen'),
      )
    },
  })

  const inputClass = `w-full px-3.5 py-2.5 rounded-lg bg-surface border border-edge text-foreground text-sm
    placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent/40
    focus:border-accent transition-colors`

  return (
    <Dialog title="Account anlegen" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="new-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            required
            autoFocus
            autoComplete="off"
            className={inputClass}
            placeholder="brudi@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-name" className="text-sm font-medium text-foreground">
            Name <span className="text-foreground-subtle font-normal">(optional)</span>
          </label>
          <input
            id="new-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className={inputClass}
            placeholder="Brudi"
          />
        </div>

        <button
          type="button"
          onClick={() => setMakeAdmin((v) => !v)}
          className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg bg-surface border border-edge text-left"
        >
          <span>
            <span className="block text-sm text-foreground">Als Admin anlegen</span>
            <span className="block text-[11px] text-foreground-subtle mt-0.5">
              Darf selbst Accounts verwalten
            </span>
          </span>
          <span
            role="switch"
            aria-checked={makeAdmin}
            className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${
              makeAdmin ? 'bg-accent' : 'bg-surface-overlay'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full shadow transition-transform ${makeAdmin ? 'bg-white translate-x-4.5' : 'bg-foreground-subtle translate-x-0'}`}
            />
          </span>
        </button>

        <p className="text-[11px] text-foreground-subtle leading-relaxed">
          Das Passwort wird generiert und dir gleich einmalig angezeigt. Beim
          ersten Login muss es geändert werden.
        </p>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-500/8 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!email.trim() || create.isPending}
          className="py-2.5 rounded-lg bg-accent text-black text-sm font-semibold hover:opacity-90
                     disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {create.isPending ? 'Wird angelegt…' : 'Anlegen'}
        </button>
      </form>
    </Dialog>
  )
}

// ─── Delete dialog ────────────────────────────────────────────────────────────

function DeleteUserDialog({
  user,
  onClose,
}: {
  user: AdminUser
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [typed, setTyped] = useState('')

  const confirmed = typed.trim().toLowerCase() === user.email.toLowerCase()

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/users/${user.id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY })
      notify.success(`${user.email} wurde gelöscht`)
      onClose()
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      notify.error(err.response?.data?.message ?? 'Löschen fehlgeschlagen')
    },
  })

  return (
    <Dialog title="Account löschen" onClose={onClose}>
      <p className="text-sm text-foreground-muted leading-relaxed">
        <span className="text-foreground">{user.email}</span> wird endgültig
        gelöscht — zusammen mit {user.savedSongs} gespeicherten Songs, allen
        Notizen und Collections. Auch den öffentlichen.
      </p>
      <p className="text-sm text-foreground-muted leading-relaxed mt-3">
        Anmerkungen, die andere zu diesen Songzeilen geschrieben haben, gehen
        dabei mit drauf. Das lässt sich nicht rückgängig machen.
      </p>

      <label
        htmlFor="confirm-email"
        className="block text-[11px] text-foreground-subtle mt-5 mb-1.5"
      >
        Tipp zur Bestätigung die Email ein
      </label>
      <input
        id="confirm-email"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={user.email}
        className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-edge text-foreground text-base font-mono
                   placeholder:text-foreground-subtle placeholder:font-sans
                   focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-colors"
      />

      <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-edge text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-surface-overlay transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={() => remove.mutate()}
          disabled={!confirmed || remove.isPending}
          className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {remove.isPending ? 'Wird gelöscht…' : 'Endgültig löschen'}
        </button>
      </div>
    </Dialog>
  )
}

// ─── User card ────────────────────────────────────────────────────────────────

function UserCard({
  user,
  isSelf,
  onCredentials,
  onDelete,
}: {
  user: AdminUser
  isSelf: boolean
  onCredentials: (result: ProvisionedUser) => void
  onDelete: (user: AdminUser) => void
}) {
  const queryClient = useQueryClient()
  const notify = useNotify()

  function handleError(err: { response?: { data?: { message?: string } } }) {
    notify.error(err.response?.data?.message ?? 'Hat nicht geklappt')
  }

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY })

  const resetPassword = useMutation({
    mutationFn: () =>
      api
        .post<ProvisionedUser>(`/admin/users/${user.id}/reset-password`)
        .then((r) => r.data),
    onSuccess: (result) => {
      invalidate()
      onCredentials(result)
    },
    onError: handleError,
  })

  const patch = useMutation({
    mutationFn: (data: { isActive?: boolean; role?: Role }) =>
      api.patch(`/admin/users/${user.id}`, data),
    onSuccess: invalidate,
    onError: handleError,
  })

  const busy = resetPassword.isPending || patch.isPending
  // The owner account is off limits for everyone — that is what makes it the
  // way back in when something goes sideways.
  const locked = user.isProtected || isSelf

  return (
    <div
      className={`rounded-xl bg-surface-raised border border-edge overflow-hidden ${
        user.isActive ? '' : 'opacity-60'
      }`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user.name || user.email.split('@')[0]}
            </p>
            <p className="text-xs text-foreground-muted truncate mt-0.5">
              {user.email}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1 flex-shrink-0">
            {user.isProtected && (
              <Badge tone="accent">
                <ShieldCheck size={9} strokeWidth={2.5} />
                Geschützt
              </Badge>
            )}
            {user.role === 'ADMIN' && !user.isProtected && (
              <Badge tone="accent">
                <Shield size={9} strokeWidth={2.5} />
                Admin
              </Badge>
            )}
            {isSelf && <Badge tone="muted">Du</Badge>}
            {!user.isActive && <Badge tone="danger">Deaktiviert</Badge>}
            {user.mustChangePassword && (
              <Badge tone="muted">Passwort offen</Badge>
            )}
          </div>
        </div>

        <p className="text-[11px] text-foreground-subtle mt-2">
          {user.savedSongs} {user.savedSongs === 1 ? 'Song' : 'Songs'} · dabei
          seit {formatDate(user.createdAt)} · zuletzt {formatDate(user.lastLoginAt)}
        </p>
      </div>

      {!locked && (
        <div className="px-4 py-2.5 border-t border-edge flex flex-wrap gap-1.5">
          <ActionButton onClick={() => resetPassword.mutate()} disabled={busy}>
            <KeyRound size={11} strokeWidth={1.75} />
            Passwort zurücksetzen
          </ActionButton>

          <ActionButton
            onClick={() =>
              patch.mutate({ role: user.role === 'ADMIN' ? 'USER' : 'ADMIN' })
            }
            disabled={busy}
          >
            <Shield size={11} strokeWidth={1.75} />
            {user.role === 'ADMIN' ? 'Admin entziehen' : 'Zum Admin machen'}
          </ActionButton>

          <ActionButton
            onClick={() => patch.mutate({ isActive: !user.isActive })}
            disabled={busy}
          >
            {user.isActive ? (
              <>
                <Ban size={11} strokeWidth={1.75} />
                Deaktivieren
              </>
            ) : (
              <>
                <Check size={11} strokeWidth={2} />
                Reaktivieren
              </>
            )}
          </ActionButton>

          {/* Deleting cascades into other people's data, so it only unlocks
              once the reversible option has been taken. */}
          {!user.isActive && (
            <ActionButton onClick={() => onDelete(user)} disabled={busy} tone="danger">
              <Trash2 size={11} strokeWidth={1.75} />
              Löschen
            </ActionButton>
          )}
        </div>
      )}

      {!locked && user.isActive && (
        <div className="px-4 pb-2.5 -mt-1">
          <p className="text-[10px] text-foreground-subtle">
            Deaktivieren sperrt nur den Login. Geteilte Inhalte bleiben sichtbar.
          </p>
        </div>
      )}

      {locked && (
        <div className="px-4 py-2.5 border-t border-edge">
          <p className="text-[11px] text-foreground-subtle">
            {user.isProtected
              ? 'Geschützter Account — Rolle, Status und Passwort ändert nur er selbst.'
              : 'Dein eigener Account. Passwort änderst du in den Einstellungen.'}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const me = useAuthStore((s) => s.user)
  const [creating, setCreating] = useState(false)
  const [credentials, setCredentials] = useState<ProvisionedUser | null>(null)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: () => api.get<AdminUser[]>('/admin/users').then((r) => r.data),
  })

  return (
    <div className="px-4 sm:px-8 py-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
            Admin
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            Nutzerverwaltung
          </h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-accent text-black text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0"
        >
          <UserPlus size={15} strokeWidth={2} />
          Anlegen
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-surface-raised border border-edge animate-pulse"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-500/8 rounded-lg px-3 py-2.5">
          Die Nutzerliste konnte nicht geladen werden.
        </p>
      )}

      {users && (
        <div className="space-y-3">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isSelf={user.id === me?.id}
              onCredentials={setCredentials}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {creating && (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onCreated={(result) => {
            setCreating(false)
            setCredentials(result)
          }}
        />
      )}

      {credentials && (
        <CredentialsDialog
          result={credentials}
          onClose={() => setCredentials(null)}
        />
      )}

      {deleting && (
        <DeleteUserDialog user={deleting} onClose={() => setDeleting(null)} />
      )}
    </div>
  )
}
