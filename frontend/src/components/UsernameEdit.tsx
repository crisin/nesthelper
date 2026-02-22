import { useRef, useState } from 'react'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import type { User } from '../types'

export default function UsernameEdit() {
  const user       = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setDraft(user?.name ?? '')
    setError(null)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function cancel() { setEditing(false); setError(null) }

  async function save() {
    const trimmed = draft.trim()
    if (!trimmed) { setError('Cannot be empty.'); return }
    if (trimmed.length > 30) { setError('Max 30 chars.'); return }
    setSaving(true)
    setError(null)
    try {
      const { data } = await api.patch<User>('/auth/me', { name: trimmed })
      updateUser({ name: data.name })
      setEditing(false)
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={30}
          placeholder="Username"
          autoFocus
          className="bg-app-input border border-app-edge rounded-lg px-2 py-1.5 w-full focus:outline-none text-sm"
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-xs font-medium text-spotify-green disabled:opacity-40"
        >
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={cancel} className="text-xs text-app-faint hover:text-app-ink transition-colors">
          Cancel
        </button>
        {error && <span className="text-xs text-red-500 dark:text-red-400">{error}</span>}
      </div>
    )
  }

  return (
    <button
      onClick={startEditing}
      title="Edit username"
      className="group flex items-center gap-1.5 text-sm text-app-muted"
    >
      <span className="max-w-[120px] truncate">{user?.name ?? user?.email}</span>
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round"
        className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0"
        aria-hidden
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  )
}
