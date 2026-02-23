import { useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
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
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={30}
            placeholder="Username"
            autoFocus
            className="bg-surface-overlay border border-edge rounded-lg px-2 py-1.5 flex-1 min-w-0
                       focus:outline-none focus:border-foreground-muted/60 text-sm transition-colors"
          />
          <button
            onClick={save}
            disabled={saving}
            className="text-xs font-medium text-accent disabled:opacity-40 flex-shrink-0"
          >
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={cancel} className="text-xs text-foreground-subtle hover:text-foreground transition-colors flex-shrink-0">
            Cancel
          </button>
        </div>
        {error && <span className="text-[11px] text-red-500 dark:text-red-400">{error}</span>}
      </div>
    )
  }

  return (
    <button
      onClick={startEditing}
      title="Edit username"
      className="group flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors w-full"
    >
      <span className="max-w-[140px] truncate text-left">{user?.name ?? user?.email}</span>
      <Pencil
        size={11}
        strokeWidth={1.75}
        className="opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0"
        aria-hidden
      />
    </button>
  )
}
