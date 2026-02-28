import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Eye, Pencil, History, ChevronDown, ChevronUp, MessageSquarePlus,
  RotateCcw, Check, Music, Headphones, Timer, Loader2,
} from 'lucide-react'
import api from '../services/api'
import type { StructuredLyrics, LineAnnotation, LyricsFetchStatus } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// ─── Fetch-status skeleton ─────────────────────────────────────────────────────

function FetchingLyricsSkeleton() {
  return (
    <div className="rounded-xl bg-surface-raised border border-edge px-5 py-8 flex flex-col items-center gap-3">
      <Loader2 size={20} className="text-foreground-subtle animate-spin" />
      <div className="space-y-1 text-center">
        <p className="text-sm text-foreground-muted">Lyrics werden geladen…</p>
        <p className="text-xs text-foreground-subtle">Das dauert nur einen Moment.</p>
      </div>
      <div className="w-full mt-2 space-y-2.5">
        {[58, 42, 55, 35, 48, 62, 40].map((w, i) => (
          <div
            key={i}
            className="h-2.5 rounded-full bg-surface-overlay animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Plain-text stanza fallback (legacy display) ──────────────────────────────

function PlainLyricsView({
  lyrics,
  onEdit,
  fetchStatus,
}: {
  lyrics: string
  onEdit: () => void
  fetchStatus?: LyricsFetchStatus
}) {
  if (fetchStatus === 'FETCHING') return <FetchingLyricsSkeleton />

  if (!lyrics.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-edge gap-3 text-center">
        <Music size={26} className="text-foreground-subtle" strokeWidth={1.25} />
        <div className="space-y-1">
          <p className="text-sm text-foreground-muted font-medium">
            {fetchStatus === 'FAILED' ? 'Lyrics konnten nicht geladen werden' : 'Noch keine Lyrics'}
          </p>
          <p className="text-xs text-foreground-subtle">
            {fetchStatus === 'FAILED'
              ? 'Füge sie manuell hinzu.'
              : 'Wechsel in den Editiermodus, um Lyrics hinzuzufügen.'}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="mt-1 px-3 py-1.5 rounded-lg bg-surface-raised border border-edge text-xs font-medium
                     text-foreground-muted hover:text-foreground hover:border-foreground-muted/50 transition-colors"
        >
          Lyrics hinzufügen
        </button>
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-surface-raised border border-edge px-5 sm:px-7 py-6">
      <div className="space-y-6">
        {lyrics.split(/\n{2,}/).map((stanza, i) => (
          <p key={i} className="text-[15px] leading-[1.85] text-foreground tracking-[0.008em]">
            {stanza.split('\n').map((line, j, arr) => (
              <span key={j}>
                {line || <span>&thinsp;</span>}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  )
}

// ─── Structured line with annotation + seek ───────────────────────────────────

function AnnotatedLine({
  lineId,
  lyricsId,
  text,
  annotations,
  timestampMs,
  isActive,
  onSeek,
}: {
  lineId: string
  lyricsId: string
  text: string
  annotations: LineAnnotation[]
  timestampMs?: number | null
  isActive?: boolean
  onSeek?: (ms: number) => void
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const myAnnotation = annotations[0] ?? null

  const saveMutation = useMutation({
    mutationFn: () =>
      myAnnotation
        ? api.patch(`/line-annotations/${myAnnotation.id}`, { text: draft }).then((r) => r.data)
        : api.post(`/line-annotations/${lineId}`, { text: draft }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-annotations', lyricsId] })
      setOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/line-annotations/${myAnnotation!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-annotations', lyricsId] })
      setOpen(false)
    },
  })

  function handleOpen() {
    setDraft(myAnnotation?.text ?? '')
    setOpen((v) => !v)
  }

  if (!text.trim()) {
    return <div className="h-4" />
  }

  return (
    <div
      className={[
        'group rounded-lg transition-colors px-2 -mx-2',
        isActive ? 'bg-accent/10' : 'hover:bg-surface-overlay/50',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        {/* Seek button — visible on hover, always visible when active */}
        {timestampMs != null && onSeek && (
          <button
            onClick={() => onSeek(timestampMs)}
            title={`Zu ${formatMs(timestampMs)} springen`}
            className={[
              'flex-shrink-0 mt-2 p-0.5 rounded transition-colors',
              isActive
                ? 'text-accent'
                : 'text-foreground-subtle opacity-0 group-hover:opacity-100 hover:text-accent',
            ].join(' ')}
          >
            <Timer size={10} strokeWidth={1.75} />
          </button>
        )}
        <span
          className={[
            'flex-1 text-[15px] leading-[1.85] tracking-[0.008em] transition-colors',
            isActive ? 'text-foreground font-medium' : 'text-foreground',
          ].join(' ')}
        >
          {text}
        </span>
        <button
          onClick={handleOpen}
          title={myAnnotation ? 'Edit annotation' : 'Add annotation'}
          className={[
            'flex-shrink-0 mt-1.5 p-0.5 rounded transition-colors',
            myAnnotation
              ? 'text-accent/70 hover:text-accent'
              : 'text-foreground-subtle opacity-0 group-hover:opacity-100 hover:text-foreground-muted',
          ].join(' ')}
        >
          <MessageSquarePlus size={12} strokeWidth={1.75} />
        </button>
      </div>

      {myAnnotation && !open && (
        <p className="ml-0 mt-0.5 text-[11px] text-accent/70 italic leading-snug">
          {myAnnotation.emoji && <span className="not-italic mr-1">{myAnnotation.emoji}</span>}
          {myAnnotation.text}
        </p>
      )}

      {open && (
        <div className="mt-1.5 ml-0 flex items-start gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); saveMutation.mutate() }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Was bedeutet diese Zeile für dich?"
            className="flex-1 text-xs bg-surface border border-edge rounded-lg px-2.5 py-1.5
                       focus:outline-none focus:border-accent/50 placeholder:text-foreground-subtle"
          />
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!draft.trim() || saveMutation.isPending}
            className="p-1.5 rounded-lg bg-accent text-black disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Check size={11} strokeWidth={2.5} />
          </button>
          {myAnnotation && (
            <button
              onClick={() => deleteMutation.mutate()}
              className="text-[10px] text-foreground-subtle hover:text-red-400 transition-colors px-1"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Structured view (line-by-line with annotations + karaoke support) ────────

function StructuredLyricsView({
  structured,
  onEdit,
  activeLineId,
  onSeek,
}: {
  structured: StructuredLyrics
  onEdit: () => void
  activeLineId?: string | null
  onSeek?: (ms: number) => void
}) {
  const { data: annotations = {} } = useQuery<Record<string, LineAnnotation[]>>({
    queryKey: ['line-annotations', structured.id],
    queryFn: async () => {
      const lineIds = (structured.lines ?? []).map((l) => l.id)
      const results = await Promise.all(
        lineIds.map((id) =>
          api.get<LineAnnotation[]>(`/line-annotations?lineId=${id}`).then((r) => ({
            id,
            data: r.data,
          })),
        ),
      )
      return Object.fromEntries(results.map((r) => [r.id, r.data]))
    },
    enabled: (structured.lines?.length ?? 0) > 0,
    staleTime: 30_000,
  })

  if (!structured.lines?.length) {
    return <PlainLyricsView lyrics="" onEdit={onEdit} />
  }

  return (
    <div className="rounded-xl bg-surface-raised border border-edge px-5 sm:px-7 py-6 space-y-0.5">
      {(structured.lines ?? []).map((line) => (
        <AnnotatedLine
          key={line.id}
          lineId={line.id}
          lyricsId={structured.id}
          text={line.text}
          annotations={annotations[line.id] ?? []}
          timestampMs={line.timestampMs}
          isActive={activeLineId === line.id}
          onSeek={onSeek}
        />
      ))}
    </div>
  )
}

// ─── Version history panel ────────────────────────────────────────────────────

function VersionHistory({
  structured,
  savedLyricId,
}: {
  structured: StructuredLyrics
  savedLyricId: string
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const restore = useMutation({
    mutationFn: (version: number) =>
      api.post(`/lyrics/${savedLyricId}/restore/${version}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lyrics', savedLyricId] })
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      setOpen(false)
    },
  })

  if (structured.versions.length === 0) return null

  return (
    <div className="border-t border-edge pt-3 mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-foreground-subtle
                   hover:text-foreground-muted transition-colors"
      >
        <History size={11} strokeWidth={1.75} />
        {structured.versions.length} frühere{structured.versions.length === 1 ? '' : 'n'} Version
        {open ? (
          <ChevronUp size={10} strokeWidth={2} />
        ) : (
          <ChevronDown size={10} strokeWidth={2} />
        )}
      </button>

      {open && (
        <ul className="mt-2 space-y-1">
          {structured.versions.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg
                         bg-surface hover:bg-surface-raised border border-edge transition-colors"
            >
              <div>
                <span className="text-xs font-medium text-foreground-muted">v{v.version}</span>
                <span className="ml-2 text-[11px] text-foreground-subtle">{timeAgo(v.createdAt)}</span>
                <p className="text-[11px] text-foreground-subtle mt-0.5 line-clamp-1 max-w-xs">
                  {v.rawText.split('\n')[0]}
                </p>
              </div>
              <button
                onClick={() => restore.mutate(v.version)}
                disabled={restore.isPending}
                className="flex items-center gap-1 text-[10px] text-foreground-subtle
                           hover:text-accent transition-colors disabled:opacity-40"
              >
                <RotateCcw size={10} strokeWidth={2} />
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  savedLyricId: string
  legacyLyrics: string
  fetchStatus?: LyricsFetchStatus
}

export default function LyricsEditor({ savedLyricId, legacyLyrics, fetchStatus }: Props) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [draft, setDraft] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [karaoke, setKaraoke] = useState(false)

  // Poll lyrics endpoint while auto-fetch is in progress
  const { data: structured = null } = useQuery<StructuredLyrics | null>({
    queryKey: ['lyrics', savedLyricId],
    queryFn: () =>
      api.get<StructuredLyrics | null>(`/lyrics/${savedLyricId}`).then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: fetchStatus === 'FETCHING' ? 5_000 : false,
  })

  // Poll Spotify current track every second while karaoke mode is active
  const { data: currentTrack } = useQuery<{ progress_ms: number } | null>({
    queryKey: ['spotify-current-track'],
    queryFn: () => api.get('/spotify/current-track').then((r) => r.data),
    enabled: karaoke,
    refetchInterval: 1_000,
    staleTime: 0,
  })

  const progressMs = currentTrack?.progress_ms ?? 0

  // Determine which line should be highlighted based on playback position
  const activeLineId = useMemo(() => {
    if (!karaoke || !structured) return null
    const timedLines = (structured.lines ?? []).filter((l) => l.timestampMs != null)
    if (timedLines.length === 0) return null
    let active = timedLines[0]
    for (const line of timedLines) {
      if (line.timestampMs! <= progressMs) active = line
      else break
    }
    return active.id
  }, [karaoke, progressMs, structured])

  const seek = useMutation({
    mutationFn: (positionMs: number) =>
      api.post(`/spotify/seek?positionMs=${positionMs}`),
  })

  const hasTimestamps = structured?.lines?.some((l) => l.timestampMs != null) ?? false

  const currentText =
    draft !== null ? draft : structured?.rawText ?? legacyLyrics ?? ''
  const isDirty = draft !== null && draft !== (structured?.rawText ?? legacyLyrics ?? '')

  const save = useMutation({
    mutationFn: (rawText: string) =>
      api.put(`/lyrics/${savedLyricId}`, { rawText }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['lyrics', savedLyricId], data)
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      setDraft(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setMode('view')
    },
  })

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
            Lyrics
          </p>
          {structured && (
            <span className="text-[10px] text-foreground-subtle font-mono">
              v{structured.version}
            </span>
          )}
          {structured && (
            <span className="text-[10px] text-foreground-subtle">
              · {timeAgo(structured.updatedAt)}
            </span>
          )}
          {fetchStatus === 'FETCHING' && !structured && (
            <span className="flex items-center gap-1 text-[10px] text-foreground-subtle">
              <Loader2 size={9} className="animate-spin" />
              Lädt…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Karaoke toggle — only shown when structured lyrics with timestamps exist */}
          {mode === 'view' && hasTimestamps && (
            <button
              onClick={() => setKaraoke((v) => !v)}
              title={karaoke ? 'Karaoke-Modus deaktivieren' : 'Karaoke-Modus aktivieren'}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                karaoke
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'border-edge text-foreground-subtle hover:text-foreground-muted',
              ].join(' ')}
            >
              <Headphones size={11} strokeWidth={2} />
              Karaoke
            </button>
          )}

          {/* View / Edit toggle */}
          <div className="flex items-center rounded-lg border border-edge bg-surface-raised p-0.5 gap-0.5">
            <button
              onClick={() => setMode('view')}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                mode === 'view'
                  ? 'bg-surface-overlay text-foreground'
                  : 'text-foreground-subtle hover:text-foreground-muted',
              ].join(' ')}
            >
              <Eye size={11} strokeWidth={2} />
              Ansicht
            </button>
            <button
              onClick={() => { setMode('edit'); if (draft === null) setDraft(currentText) }}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                mode === 'edit'
                  ? 'bg-surface-overlay text-foreground'
                  : 'text-foreground-subtle hover:text-foreground-muted',
              ].join(' ')}
            >
              <Pencil size={11} strokeWidth={2} />
              Bearbeiten
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {mode === 'view' ? (
        structured ? (
          <StructuredLyricsView
            structured={structured}
            onEdit={() => setMode('edit')}
            activeLineId={activeLineId}
            onSeek={(ms) => seek.mutate(ms)}
          />
        ) : (
          <PlainLyricsView
            lyrics={legacyLyrics}
            onEdit={() => setMode('edit')}
            fetchStatus={fetchStatus}
          />
        )
      ) : (
        <>
          <textarea
            className="w-full min-h-48 sm:min-h-96 bg-surface-raised border border-edge rounded-xl p-4 resize-y
                       focus:outline-none focus:border-foreground-muted/60 transition-colors text-sm leading-relaxed"
            placeholder="Lyrics hier einfügen…"
            value={currentText}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => save.mutate(currentText)}
              disabled={!isDirty || save.isPending}
              className="px-4 py-2 sm:py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                         disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {save.isPending ? 'Speichern…' : 'Lyrics speichern'}
            </button>
            {saved && <span className="text-xs text-accent">Gespeichert!</span>}
            {isDirty && !save.isPending && (
              <button
                onClick={() => setDraft(null)}
                className="text-xs text-foreground-muted hover:text-foreground transition-colors"
              >
                Verwerfen
              </button>
            )}
          </div>
        </>
      )}

      {/* Version history (only in view mode when structured lyrics exist) */}
      {mode === 'view' && structured && (
        <VersionHistory structured={structured} savedLyricId={savedLyricId} />
      )}
    </div>
  )
}
