import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, KeyRound, Trash2 } from 'lucide-react'
import api from '../../services/api'
import type { ApiTokenInfo, CreatedApiToken } from '../../types'

const KEY = ['api-tokens']

function when(iso: string | null): string {
  if (!iso) return 'nie benutzt'
  const d = new Date(iso)
  return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Einstellungen → Verbundene Apps: persönliche API-Tokens, z. B. für den
 * vizzy-Visualizer. Der Token ist nur direkt nach dem Anlegen sichtbar.
 */
export default function ApiTokenSettings() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('vizzy')
  const [created, setCreated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const { data: tokens, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => api.get<ApiTokenInfo[]>('/api-tokens').then((r) => r.data),
    staleTime: 60_000,
  })

  const create = useMutation({
    mutationFn: (n: string) =>
      api.post<CreatedApiToken>('/api-tokens', { name: n }).then((r) => r.data),
    onSuccess: (res) => {
      setCreated(res.token)
      setCopied(false)
      queryClient.setQueryData<ApiTokenInfo[]>(KEY, (old) => [res.info, ...(old ?? [])])
    },
  })

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api-tokens/${id}`),
    onSuccess: (_r, id) => {
      setConfirmId(null)
      queryClient.setQueryData<ApiTokenInfo[]>(KEY, (old) => (old ?? []).filter((t) => t.id !== id))
    },
  })

  async function copy() {
    if (!created) return
    await navigator.clipboard.writeText(created)
    setCopied(true)
  }

  return (
    <section className="pt-6 border-t border-edge space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Verbundene Apps</h2>
        <p className="text-xs text-foreground-subtle mt-0.5">
          Persönliche Tokens für lokale Tools wie vizzy. Sie lesen Tags, Mood und Song-Abschnitte – nur für dein
          Konto.
        </p>
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) create.mutate(name.trim())
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Name, z. B. vizzy"
          aria-label="Token-Name"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-raised border border-edge text-sm text-foreground
                     placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!name.trim() || create.isPending}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-black text-xs font-semibold
                     hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <KeyRound size={13} strokeWidth={2} />
          {create.isPending ? 'Wird erstellt…' : 'Token erstellen'}
        </button>
      </form>

      {created && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 space-y-2">
          <p className="text-xs text-foreground">
            Dein neuer Token – jetzt kopieren, er wird <b>nicht noch einmal</b> angezeigt:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate rounded-md bg-surface-overlay px-2 py-1.5 text-xs text-foreground font-mono select-all">
              {created}
            </code>
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-edge text-xs text-foreground-muted
                         hover:text-foreground transition-colors flex-shrink-0"
            >
              {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={2} />}
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="text-xs text-foreground-subtle hover:text-foreground-muted transition-colors"
          >
            Fertig
          </button>
        </div>
      )}

      {create.isError && <p className="text-xs text-red-400">Token konnte nicht erstellt werden.</p>}

      <div className="rounded-xl bg-surface-raised border border-edge divide-y divide-edge">
        {isLoading ? (
          <div className="px-4 py-3">
            <div className="h-3 w-32 rounded-full bg-surface-overlay animate-pulse" />
          </div>
        ) : !tokens?.length ? (
          <p className="px-4 py-3 text-xs text-foreground-subtle">Noch keine Tokens.</p>
        ) : (
          tokens.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{t.name}</p>
                <p className="text-xs text-foreground-subtle truncate">
                  <span className="font-mono">{t.prefix}…</span> · erstellt {when(t.createdAt)} ·{' '}
                  {t.lastUsedAt ? `zuletzt ${when(t.lastUsedAt)}` : 'nie benutzt'}
                </p>
              </div>
              {confirmId === t.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => revoke.mutate(t.id)}
                    disabled={revoke.isPending}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-40"
                  >
                    Widerrufen
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="text-xs text-foreground-subtle hover:text-foreground-muted"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(t.id)}
                  aria-label={`${t.name} widerrufen`}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-subtle
                             hover:bg-surface-overlay hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
