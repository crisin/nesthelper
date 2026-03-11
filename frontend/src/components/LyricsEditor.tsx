import { useState, useMemo, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Eye, Pencil, History, ChevronDown, ChevronUp, MessageSquarePlus,
  RotateCcw, Check, Music, Headphones, Timer, Loader2, Rewind, X,
  BookOpen, MessageSquare, Clock,
} from 'lucide-react'
import api from '../services/api'
import type { SongLyrics, LineAnnotation, LyricsFetchStatus, SpotifyCurrentlyPlayingResponse } from '../types'
import { useAuthStore } from '../stores/authStore'

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

function msToInput(ms: number | null | undefined): string {
  if (ms == null) return ''
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function inputToMs(val: string): number | null {
  const match = val.match(/^(\d+):([0-5]\d)$/)
  if (!match) return null
  return (parseInt(match[1], 10) * 60 + parseInt(match[2], 10)) * 1000
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

// ─── Empty / plain-text view ──────────────────────────────────────────────────

function LyricsView({
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

// ─── Structured line with annotations ────────────────────────────────────────

function AnnotatedLine({
  lineId,
  spotifyId,
  text,
  annotations,
  currentUserId,
  showAnnotations,
  showTimestamps,
  timestampMs,
  isActive,
  onSeek,
}: {
  lineId: string
  spotifyId: string
  text: string
  annotations: LineAnnotation[]
  currentUserId: string
  showAnnotations: boolean
  showTimestamps?: boolean
  timestampMs?: number | null
  isActive?: boolean
  onSeek?: (ms: number) => void
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [tsEditing, setTsEditing] = useState(false)
  const [tsInput, setTsInput] = useState('')

  const myAnnotation = annotations.find((a) => a.userId === currentUserId) ?? null
  const othersAnnotations = annotations.filter((a) => a.userId !== currentUserId)

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/songs/${spotifyId}/annotations/${lineId}`, { text: draft }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', spotifyId] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/songs/${spotifyId}/annotations/${lineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', spotifyId] })
      setEditing(false)
    },
  })

  const saveTs = useMutation({
    mutationFn: (ms: number | null) =>
      api
        .patch(`/songs/${spotifyId}/lyrics/timestamps`, {
          lines: [{ id: lineId, timestampMs: ms }],
        })
        .then((r) => r.data),
    onSuccess: (data: SongLyrics) => {
      queryClient.setQueryData(['lyrics', spotifyId], data)
      setTsEditing(false)
    },
  })

  function handleTsSave() {
    if (tsInput === '') { saveTs.mutate(null); return }
    const ms = inputToMs(tsInput)
    if (ms !== null) saveTs.mutate(ms)
    else setTsEditing(false)
  }

  function handleTsCapture(e: React.MouseEvent) {
    // mousedown: prevent blur from firing before we read the cache
    e.preventDefault()
    const track = queryClient.getQueryData<SpotifyCurrentlyPlayingResponse | null>(['spotify-current-track'])
    const ms = track?.progress_ms ?? 0
    setTsInput(msToInput(ms))
    saveTs.mutate(ms)
  }

  function openEditor() {
    setDraft(myAnnotation?.text ?? '')
    setEditing(true)
  }

  if (!text.trim()) return <div className="h-4" />

  return (
    <div
      className={[
        'group rounded-lg transition-colors px-2 -mx-2',
        isActive ? 'bg-accent/10' : 'hover:bg-surface-overlay/50',
      ].join(' ')}
    >
      {/* Line text row */}
      <div className="flex items-start gap-2">
        {/* Inline timestamp cell */}
        {showTimestamps && (
          <div className="flex-shrink-0 mt-[9px]">
            {tsEditing ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={tsInput}
                  onChange={(e) => setTsInput(e.target.value)}
                  onBlur={handleTsSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleTsSave() }
                    if (e.key === 'Escape') setTsEditing(false)
                  }}
                  placeholder="0:00"
                  className="w-11 text-center text-[11px] tabular-nums bg-surface border border-accent/50
                             rounded px-1 py-0.5 focus:outline-none focus:border-accent"
                />
                <button
                  onMouseDown={handleTsCapture}
                  title="Aktuelle Spotify-Position"
                  className="text-foreground-subtle hover:text-accent transition-colors"
                >
                  <Timer size={10} strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTsInput(msToInput(timestampMs)); setTsEditing(true) }}
                title="Timestamp bearbeiten"
                className="text-[11px] tabular-nums text-foreground-subtle hover:text-foreground-muted
                           transition-colors min-w-[40px] text-right block"
              >
                {timestampMs != null
                  ? msToInput(timestampMs)
                  : <span className="text-foreground-subtle/25 select-none">·</span>}
              </button>
            )}
          </div>
        )}

        {/* Seek button (karaoke) */}
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

        {/* Add/edit own annotation */}
        {showAnnotations && !editing && (
          <button
            onClick={openEditor}
            title={myAnnotation ? 'Edit your annotation' : 'Add annotation'}
            className={[
              'flex-shrink-0 mt-1.5 p-0.5 rounded transition-colors',
              myAnnotation
                ? 'text-accent/70 hover:text-accent'
                : 'text-foreground-subtle opacity-0 group-hover:opacity-100 hover:text-foreground-muted',
            ].join(' ')}
          >
            <MessageSquarePlus size={12} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Other users' annotations (read-only) */}
      {showAnnotations && othersAnnotations.length > 0 && (
        <div className="mt-1 space-y-0.5 pl-0">
          {othersAnnotations.map((a) => (
            <div key={a.id} className="flex items-start gap-1.5">
              <span className="text-[10px] text-foreground-subtle mt-0.5 flex-shrink-0 font-medium">
                {a.user.name ?? 'Anonym'}
              </span>
              <p className="text-[11px] text-foreground-muted italic leading-snug">
                {a.emoji && <span className="not-italic mr-1">{a.emoji}</span>}
                {a.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Own annotation (view) */}
      {showAnnotations && myAnnotation && !editing && (
        <p className="mt-0.5 text-[11px] text-accent/80 italic leading-snug">
          {myAnnotation.emoji && <span className="not-italic mr-1">{myAnnotation.emoji}</span>}
          <span className="font-medium not-italic text-[10px] text-accent/60 mr-1">Du:</span>
          {myAnnotation.text}
        </p>
      )}

      {/* Own annotation editor */}
      {editing && (
        <div className="mt-1.5 flex items-start gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) saveMutation.mutate() }
              if (e.key === 'Escape') setEditing(false)
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
          <button
            onClick={() => setEditing(false)}
            className="p-1.5 rounded-lg text-foreground-subtle hover:text-foreground transition-colors"
          >
            <X size={11} strokeWidth={2} />
          </button>
          {myAnnotation && (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-[10px] text-foreground-subtle hover:text-red-400 transition-colors px-1 self-center"
            >
              Löschen
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Structured view (line-by-line with annotations + karaoke + timestamps) ──

const SHIFT_STEPS = [
  { label: '−1s',    delta: -1000 },
  { label: '−0.5s',  delta: -500  },
  { label: '+0.5s',  delta:  500  },
  { label: '+1s',    delta:  1000 },
]

function StructuredLyricsView({
  lyrics,
  spotifyId,
  showAnnotations,
  showTimestamps,
  shiftTimestamps,
  shiftPending,
  onEdit,
  activeLineId,
  onSeek,
}: {
  lyrics: SongLyrics
  spotifyId: string
  showAnnotations: boolean
  showTimestamps?: boolean
  shiftTimestamps?: (delta: number) => void
  shiftPending?: boolean
  onEdit: () => void
  activeLineId?: string | null
  onSeek?: (ms: number) => void
}) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')

  const { data: annotations = {} } = useQuery<Record<string, LineAnnotation[]>>({
    queryKey: ['annotations', spotifyId],
    queryFn: () =>
      api
        .get<Record<string, LineAnnotation[]>>(`/songs/${spotifyId}/annotations`)
        .then((r) => r.data),
    enabled: (lyrics.lines?.length ?? 0) > 0,
    staleTime: 30_000,
  })

  if (!lyrics.lines?.length) {
    return <LyricsView lyrics="" onEdit={onEdit} />
  }

  const hasAnyTimestamp = lyrics.lines.some((l) => l.timestampMs != null)

  return (
    <div className="rounded-xl bg-surface-raised border border-edge overflow-hidden">
      {/* Lag compensation strip — visible only when sync panel is open and there are timestamps */}
      {showTimestamps && hasAnyTimestamp && shiftTimestamps && (
        <div className="px-4 py-2 border-b border-edge flex items-center gap-1.5">
          <span className="text-[10px] text-foreground-subtle mr-1 select-none">Versatz</span>
          {SHIFT_STEPS.map(({ label, delta }) => (
            <button
              key={delta}
              onClick={() => shiftTimestamps(delta)}
              disabled={shiftPending}
              className="px-2 py-0.5 rounded border border-edge text-[11px] tabular-nums
                         text-foreground-subtle hover:text-foreground hover:border-foreground-muted/40
                         transition-colors disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="px-5 sm:px-7 py-6 space-y-0.5">
        {(lyrics.lines ?? []).map((line) => (
          <AnnotatedLine
            key={line.id}
            lineId={line.id}
            spotifyId={spotifyId}
            text={line.text}
            annotations={annotations[line.id] ?? []}
            currentUserId={currentUserId}
            showAnnotations={showAnnotations}
            showTimestamps={showTimestamps}
            timestampMs={line.timestampMs}
            isActive={activeLineId === line.id}
            onSeek={onSeek}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Version history panel ────────────────────────────────────────────────────

function VersionHistory({
  lyrics,
  spotifyId,
}: {
  lyrics: SongLyrics
  spotifyId: string
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const restore = useMutation({
    mutationFn: (version: number) =>
      api.post(`/songs/${spotifyId}/lyrics/restore/${version}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lyrics', spotifyId] })
      setOpen(false)
    },
  })

  if (lyrics.versions.length === 0) return null

  return (
    <div className="border-t border-edge pt-3 mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-foreground-subtle
                   hover:text-foreground-muted transition-colors"
      >
        <History size={11} strokeWidth={1.75} />
        {lyrics.versions.length} frühere{lyrics.versions.length === 1 ? '' : 'n'} Version
        {open ? <ChevronUp size={10} strokeWidth={2} /> : <ChevronDown size={10} strokeWidth={2} />}
      </button>

      {open && (
        <ul className="mt-2 space-y-1">
          {lyrics.versions.map((v) => (
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
  spotifyId: string
  fetchStatus?: LyricsFetchStatus
  onOpenViewer?: () => void
}

export default function LyricsEditor({ spotifyId, fetchStatus, onOpenViewer }: Props) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [draft, setDraft] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [karaoke, setKaraoke] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(false)

  const { data: lyrics = null } = useQuery<SongLyrics | null>({
    queryKey: ['lyrics', spotifyId],
    queryFn: () =>
      api.get<SongLyrics | null>(`/songs/${spotifyId}/lyrics`).then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: fetchStatus === 'FETCHING' ? 5_000 : false,
  })

  const { data: currentTrack } = useQuery<SpotifyCurrentlyPlayingResponse | null>({
    queryKey: ['spotify-current-track'],
    queryFn: () =>
      api.get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track').then((r) => r.data),
    enabled: karaoke || mode === 'edit' || showTimestamps,
    refetchInterval: 1_000,
    staleTime: 0,
  })

  const progressMs = currentTrack?.progress_ms ?? 0

  const activeLineId = useMemo(() => {
    if (!karaoke || !lyrics) return null
    const timedLines = (lyrics.lines ?? []).filter((l) => l.timestampMs != null)
    if (timedLines.length === 0) return null
    let active = timedLines[0]
    for (const line of timedLines) {
      if (line.timestampMs! <= progressMs) active = line
      else break
    }
    return active.id
  }, [karaoke, progressMs, lyrics])

  const seek = useMutation({
    mutationFn: (positionMs: number) =>
      api.post(`/spotify/seek?positionMs=${positionMs}`),
  })

  const hasTimestamps = lyrics?.lines?.some((l) => l.timestampMs != null) ?? false

  const pendingDelta = useRef(0)
  const shiftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushShift = useMutation({
    mutationFn: (deltaMs: number) => {
      const lines = (lyrics?.lines ?? [])
        .filter((l) => l.timestampMs != null)
        .map((l) => ({ id: l.id, timestampMs: Math.max(0, l.timestampMs! + deltaMs) }))
      return api.patch(`/songs/${spotifyId}/lyrics/timestamps`, { lines }).then((r) => r.data)
    },
    onSuccess: (data: SongLyrics) => queryClient.setQueryData(['lyrics', spotifyId], data),
  })

  const shiftTimestamps = useCallback((deltaMs: number) => {
    pendingDelta.current += deltaMs
    if (shiftTimer.current) clearTimeout(shiftTimer.current)
    shiftTimer.current = setTimeout(() => {
      const total = pendingDelta.current
      pendingDelta.current = 0
      if (total !== 0) flushShift.mutate(total)
    }, 600)
  }, [flushShift])

  const currentText = draft !== null ? draft : lyrics?.rawText ?? ''
  const isDirty = draft !== null && draft !== (lyrics?.rawText ?? '')

  const save = useMutation({
    mutationFn: (rawText: string) =>
      api
        .put(`/songs/${spotifyId}/lyrics`, { rawText, version: lyrics?.version })
        .then((r) => r.data),
    onSuccess: (data: SongLyrics) => {
      queryClient.setQueryData(['lyrics', spotifyId], data)
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
          {lyrics && (
            <span className="text-[10px] text-foreground-subtle font-mono">
              v{lyrics.version}
            </span>
          )}
          {lyrics && (
            <span className="text-[10px] text-foreground-subtle">
              · {timeAgo(lyrics.updatedAt)}
            </span>
          )}
          {fetchStatus === 'FETCHING' && !lyrics && (
            <span className="flex items-center gap-1 text-[10px] text-foreground-subtle">
              <Loader2 size={9} className="animate-spin" />
              Lädt…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'view' && lyrics && onOpenViewer && (
            <button
              onClick={onOpenViewer}
              title="Lyrics lesen"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border border-edge text-foreground-subtle hover:text-foreground-muted"
            >
              <BookOpen size={11} strokeWidth={2} />
              Lesen
            </button>
          )}

          {mode === 'view' && lyrics && (lyrics.lines?.length ?? 0) > 0 && (
            <button
              onClick={() => setShowAnnotations((v) => !v)}
              title={showAnnotations ? 'Notizen ausblenden' : 'Notizen einblenden'}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                showAnnotations
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'border-edge text-foreground-subtle hover:text-foreground-muted',
              ].join(' ')}
            >
              <MessageSquare size={11} strokeWidth={2} />
              Notizen
            </button>
          )}

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

          {mode === 'view' && lyrics && (lyrics.lines?.length ?? 0) > 0 && (
            <button
              onClick={() => setShowTimestamps((v) => !v)}
              title={showTimestamps ? 'Timestamps verstecken' : 'Timestamps bearbeiten'}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                showTimestamps
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'border-edge text-foreground-subtle hover:text-foreground-muted',
              ].join(' ')}
            >
              <Clock size={11} strokeWidth={2} />
              Sync
            </button>
          )}

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
        lyrics ? (
          <StructuredLyricsView
            lyrics={lyrics}
            spotifyId={spotifyId}
            showAnnotations={showAnnotations}
            showTimestamps={showTimestamps}
            shiftTimestamps={shiftTimestamps}
            shiftPending={flushShift.isPending}
            onEdit={() => setMode('edit')}
            activeLineId={activeLineId}
            onSeek={(ms) => seek.mutate(ms)}
          />
        ) : (
          <LyricsView
            lyrics=""
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
          <div className="flex items-center gap-3 flex-wrap">
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
            {currentTrack?.is_playing && (
              <div className="flex items-center gap-1 ml-auto">
                <Rewind size={10} className="text-foreground-subtle" strokeWidth={1.75} />
                {[5, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => seek.mutate(Math.max(0, progressMs - sec * 1000))}
                    title={`${sec}s zurückspulen`}
                    className="px-2 py-1 rounded-md border border-edge text-[11px] text-foreground-muted
                               hover:text-foreground hover:border-foreground-muted/50 transition-colors"
                  >
                    −{sec}s
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {mode === 'view' && lyrics && (
        <VersionHistory lyrics={lyrics} spotifyId={spotifyId} />
      )}
    </div>
  )
}
