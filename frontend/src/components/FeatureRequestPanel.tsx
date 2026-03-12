import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, Plus, ThumbsUp, ChevronDown, Pencil, Trash2, Check, Loader2,
} from 'lucide-react'
import api from '../services/api'
import type { FeatureRequest, FeatureStatus } from '../types'
import { useAuthStore } from '../stores/authStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGES = [
  'Dashboard', 'Entdecken', 'Favoriten', 'Song-Detail', 'Collections',
  'Bibliothek', 'Analytics', 'Timeline', 'Einstellungen',
  'Lyrics-Editor', 'Karaoke / LyricsViewer', 'Now Playing Widget',
  'Annotationen', 'Tags', 'Notizen', 'Allgemein',
]

const STATUS_META: Record<FeatureStatus, { label: string; color: string }> = {
  DRAFT:         { label: 'Entwurf',       color: 'bg-surface-overlay text-foreground-muted border-edge' },
  MUST_HAVE:     { label: 'Must Have',     color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  WORKING_ON_IT: { label: 'In Arbeit',     color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  DONE:          { label: 'Erledigt',      color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  DECLINED:      { label: 'Abgelehnt',     color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const ALL_STATUSES = Object.keys(STATUS_META) as FeatureStatus[]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FeatureStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${m.color}`}>
      {m.label}
    </span>
  )
}

function RequestCard({
  req,
  currentUserId,
}: {
  req: FeatureRequest
  currentUserId: string
}) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(req.title ?? '')
  const [content, setContent] = useState(req.content)
  const [page, setPage] = useState(req.page ?? '')
  const [statusOpen, setStatusOpen] = useState(false)

  const voteCount = req.votes.length
  const hasVoted = req.votes.some((v) => v.userId === currentUserId)
  const isOwner = req.userId === currentUserId

  const vote = useMutation({
    mutationFn: () => api.post(`/feature-requests/${req.id}/vote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-requests'] }),
  })

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/feature-requests/${req.id}`, {
        title: title.trim() || null,
        content,
        page: page || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-requests'] })
      setEditing(false)
    },
  })

  const updateStatus = useMutation({
    mutationFn: (status: FeatureStatus) =>
      api.patch(`/feature-requests/${req.id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-requests'] })
      setStatusOpen(false)
    },
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/feature-requests/${req.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-requests'] }),
  })

  if (editing) {
    return (
      <div className="rounded-xl border border-accent/30 bg-surface p-3 space-y-2.5">
        <input
          className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-1.5 text-sm
                     placeholder:text-foreground-subtle focus:outline-none focus:border-foreground-muted/50"
          placeholder="Titel (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-sm resize-none
                     placeholder:text-foreground-subtle focus:outline-none focus:border-foreground-muted/50"
          placeholder="Beschreibung"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <select
          className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-1.5 text-sm
                     text-foreground focus:outline-none focus:border-foreground-muted/50"
          value={page}
          onChange={(e) => setPage(e.target.value)}
        >
          <option value="">Seite / Feature (optional)</option>
          {PAGES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => update.mutate()}
            disabled={!content.trim() || update.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                       hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {update.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2.5} />}
            Speichern
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-lg border border-edge text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-edge bg-surface-raised overflow-hidden">
      <div
        className="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-surface-overlay/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Vote button */}
        <button
          onClick={(e) => { e.stopPropagation(); vote.mutate() }}
          disabled={vote.isPending}
          className={[
            'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border flex-shrink-0 min-w-[40px]',
            'transition-colors disabled:opacity-50',
            hasVoted
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'border-edge text-foreground-subtle hover:border-foreground-muted/40 hover:text-foreground-muted',
          ].join(' ')}
        >
          <ThumbsUp size={12} strokeWidth={hasVoted ? 2.5 : 1.75} />
          <span className="text-[10px] font-semibold tabular-nums leading-none">{voteCount}</span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {req.title && (
                <p className="text-sm font-semibold text-foreground leading-tight truncate">{req.title}</p>
              )}
              <p className={`text-xs text-foreground-muted leading-relaxed ${req.title ? 'mt-0.5' : ''} ${!expanded ? 'line-clamp-2' : ''}`}>
                {req.content}
              </p>
            </div>
            <ChevronDown
              size={13}
              className={`text-foreground-subtle flex-shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              strokeWidth={1.75}
            />
          </div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <StatusBadge status={req.status} />
            {req.page && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-edge bg-surface text-foreground-subtle">
                {req.page}
              </span>
            )}
            <span className="text-[10px] text-foreground-subtle ml-auto">
              {req.user.name ?? 'Anon'} · {new Date(req.createdAt).toLocaleDateString('de', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-edge/50 bg-surface px-3 py-2 flex items-center gap-2 flex-wrap">
          {/* Status picker */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-edge text-[11px] text-foreground-muted
                         hover:text-foreground hover:border-foreground-muted/40 transition-colors"
            >
              Status
              <ChevronDown size={10} strokeWidth={1.75} />
            </button>
            {statusOpen && (
              <div className="absolute left-0 top-full mt-1 z-20 bg-surface-raised border border-edge rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus.mutate(s)}
                    disabled={updateStatus.isPending}
                    className={[
                      'w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-surface-overlay transition-colors text-left',
                      req.status === s ? 'text-accent font-medium' : 'text-foreground-muted',
                    ].join(' ')}
                  >
                    {req.status === s && <Check size={9} strokeWidth={2.5} className="flex-shrink-0" />}
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setExpanded(false) }}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-edge text-[11px] text-foreground-muted
                       hover:text-foreground hover:border-foreground-muted/40 transition-colors"
          >
            <Pencil size={10} strokeWidth={1.75} />
            Bearbeiten
          </button>

          {isOwner && (
            <button
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-red-500/20 text-[11px] text-red-400
                         hover:bg-red-500/10 transition-colors ml-auto disabled:opacity-50"
            >
              {remove.isPending ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} strokeWidth={1.75} />}
              Löschen
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [page, setPage] = useState('')

  const create = useMutation({
    mutationFn: () =>
      api.post('/feature-requests', {
        title: title.trim() || undefined,
        content,
        page: page || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-requests'] })
      onDone()
    },
  })

  return (
    <div className="space-y-2.5 px-4 py-4 border-t border-edge bg-surface flex-shrink-0">
      <p className="text-xs font-semibold text-foreground">Neuer Feature-Wunsch</p>
      <input
        className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-sm
                   placeholder:text-foreground-subtle focus:outline-none focus:border-foreground-muted/50 transition-colors"
        placeholder="Titel (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-sm resize-none
                   placeholder:text-foreground-subtle focus:outline-none focus:border-foreground-muted/50 transition-colors"
        placeholder="Was wünschst du dir? *"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <select
        className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-sm
                   text-foreground focus:outline-none focus:border-foreground-muted/50 transition-colors"
        value={page}
        onChange={(e) => setPage(e.target.value)}
      >
        <option value="">Seite / Feature (optional)</option>
        {PAGES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => create.mutate()}
          disabled={!content.trim() || create.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-black text-xs font-semibold
                     hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {create.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.5} />}
          Einreichen
        </button>
        <button
          onClick={onDone}
          className="px-3 py-2 rounded-lg border border-edge text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}

// ─── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function FeatureRequestPanel({ onClose }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [sortBy, setSortBy] = useState<'votes' | 'date'>('votes')
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')

  const { data: requests = [], isLoading } = useQuery<FeatureRequest[]>({
    queryKey: ['feature-requests'],
    queryFn: () => api.get<FeatureRequest[]>('/feature-requests').then((r) => r.data),
    staleTime: 30_000,
  })

  const sorted = [...requests].sort((a, b) => {
    if (sortBy === 'votes') return b.votes.length - a.votes.length
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 z-40 bg-black/30 sm:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 right-0 z-50 flex flex-col
                      w-full sm:w-[420px] sm:bottom-20 sm:right-4
                      h-[80vh] sm:h-[600px] max-h-[90vh]
                      bg-surface-raised border border-edge rounded-t-2xl sm:rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-edge flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Feature-Wünsche</h2>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              {requests.length} {requests.length === 1 ? 'Eintrag' : 'Einträge'}
            </p>
          </div>

          {/* Sort toggle */}
          <div className="flex items-center rounded-lg border border-edge bg-surface p-0.5 gap-0.5">
            {(['votes', 'date'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={[
                  'px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  sortBy === s
                    ? 'bg-surface-overlay text-foreground'
                    : 'text-foreground-subtle hover:text-foreground-muted',
                ].join(' ')}
              >
                {s === 'votes' ? 'Votes' : 'Neu'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreate((v) => !v)}
            title="Neuen Wunsch einreichen"
            className={[
              'w-7 h-7 flex items-center justify-center rounded-lg border transition-colors',
              showCreate
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'border-edge text-foreground-subtle hover:text-foreground hover:border-foreground-muted/40',
            ].join(' ')}
          >
            <Plus size={14} strokeWidth={2} />
          </button>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-subtle hover:text-foreground transition-colors"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-foreground-subtle" />
            </div>
          )}
          {!isLoading && sorted.length === 0 && (
            <div className="text-center py-12 space-y-1">
              <p className="text-sm text-foreground-muted">Noch keine Wünsche.</p>
              <p className="text-xs text-foreground-subtle">Sei der Erste!</p>
            </div>
          )}
          {sorted.map((req) => (
            <RequestCard key={req.id} req={req} currentUserId={currentUserId} />
          ))}
        </div>

        {/* Create form — pinned at bottom */}
        {showCreate && <CreateForm onDone={() => setShowCreate(false)} />}
      </div>
    </>
  )
}
