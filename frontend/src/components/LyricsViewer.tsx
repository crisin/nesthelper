import { useState, useEffect, useRef, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, SlidersHorizontal, Maximize2, Minimize2, Zap, Check, SkipForward, ChevronLeft, ArrowUpRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import api from '../services/api'
import type { SongLyrics, SpotifyCurrentlyPlayingResponse } from '../types'

// ─── Settings ────────────────────────────────────────────────────────────────

type ViewerThemeKey = 'auto' | 'dark' | 'warm' | 'slate'
type ViewerFont = 'sans' | 'serif' | 'mono'
type ViewerSpacing = 'tight' | 'normal' | 'relaxed' | 'loose'

interface ViewerSettings {
  theme:      ViewerThemeKey
  font:       ViewerFont
  spacing:    ViewerSpacing
  fontSize:   number
  fontWeight: number
  customBg:   string
  customText: string
}

const VIEWER_KEY = 'lyrics-viewer-settings'

const VIEWER_THEMES: Record<ViewerThemeKey, { label: string; swatch: string; bg: string; text: string; border: string }> = {
  auto:  { label: 'Auto',  swatch: '', bg: '', text: '', border: '' },
  dark:  { label: 'Nacht', swatch: '#151515', bg: '#0d0d0d', text: '#e8e8e8', border: '#2c2c2c' },
  warm:  { label: 'Sepia', swatch: '#c8a87a', bg: '#f2ece0', text: '#2a1a0a', border: '#d4c6aa' },
  slate: { label: 'Slate', swatch: '#3a4f7a', bg: '#1a2035', text: '#bfcde0', border: '#253050' },
}

const VIEWER_FONTS: Record<ViewerFont, { label: string; stack: string }> = {
  sans:  { label: 'Sans',  stack: 'Inter, system-ui, sans-serif' },
  serif: { label: 'Serif', stack: "Georgia, 'Times New Roman', serif" },
  mono:  { label: 'Mono',  stack: "'Courier New', Courier, monospace" },
}

const VIEWER_SPACINGS: Record<ViewerSpacing, { label: string; lh: number }> = {
  tight:   { label: 'Eng',    lh: 1.45 },
  normal:  { label: 'Normal', lh: 1.75 },
  relaxed: { label: 'Weit',   lh: 2.1 },
  loose:   { label: 'Locker', lh: 2.6 },
}

function loadSettings(): ViewerSettings {
  try {
    const raw = localStorage.getItem(VIEWER_KEY)
    if (raw) return JSON.parse(raw) as ViewerSettings
  } catch { /**/ }
  return { theme: 'auto', font: 'sans', spacing: 'normal', fontSize: 1, fontWeight: 400, customBg: '', customText: '' }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface LyricsViewerProps {
  track:        string
  artist:       string
  artists?:     string[]
  imgUrl?:      string | null
  lyrics:       string
  onClose:      () => void
  authorLabel?: string
  /** When provided: fetches structured lyrics, enables karaoke + sync mode */
  spotifyId?:   string
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LyricsViewer({
  track, artist, artists, imgUrl, lyrics, onClose, authorLabel, spotifyId,
}: LyricsViewerProps) {
  const queryClient = useQueryClient()
  const location = useLocation()
  const [s, setS] = useState<ViewerSettings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Sync mode state
  const [syncMode, setSyncMode] = useState(false)
  const [syncIndex, setSyncIndex] = useState(0)
  const [pendingTs, setPendingTs] = useState<{ id: string; timestampMs: number | null }[]>([])

  const activeLineRef = useRef<HTMLDivElement | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: songLyrics } = useQuery<SongLyrics | null>({
    queryKey: ['lyrics', spotifyId],
    queryFn: () =>
      api.get<SongLyrics | null>(`/songs/${spotifyId}/lyrics`).then((r) => r.data),
    enabled: !!spotifyId,
    staleTime: 60_000,
  })

  const { data: currentTrack } = useQuery<SpotifyCurrentlyPlayingResponse | null>({
    queryKey: ['spotify-current-track'],
    queryFn: () =>
      api.get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track').then((r) => r.data),
    enabled: !!spotifyId,
    refetchInterval: syncMode ? 500 : 1_000,
    staleTime: 0,
    retry: false,
  })

  const saveTimestamps = useMutation({
    mutationFn: (lines: { id: string; timestampMs: number | null }[]) =>
      api.patch(`/songs/${spotifyId}/lyrics/timestamps`, { lines }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lyrics', spotifyId] })
      setSyncMode(false)
      setSyncIndex(0)
      setPendingTs([])
    },
  })

  // ── Derived values ────────────────────────────────────────────────────────

  const progressMs = currentTrack?.progress_ms ?? 0
  const isMatchingTrack = !!spotifyId && currentTrack?.item?.id === spotifyId
  const isPlaying = currentTrack?.is_playing ?? false

  const lines = songLyrics?.lines ?? []
  const nonEmptyLines = lines.filter((l) => l.text.trim())
  const hasTimestamps = nonEmptyLines.some((l) => l.timestampMs != null)

  // Active line for karaoke
  const activeLineId = useMemo(() => {
    if (!isMatchingTrack || !hasTimestamps) return null
    const timedLines = lines.filter((l) => l.timestampMs != null)
    if (!timedLines.length) return null
    let active = timedLines[0]
    for (const line of timedLines) {
      if (line.timestampMs! <= progressMs) active = line
      else break
    }
    return active.id
  }, [isMatchingTrack, hasTimestamps, progressMs, lines])

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeLineId && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeLineId])

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (syncMode) { setSyncMode(false); setSyncIndex(0); setPendingTs([]) }
        else onClose()
      }
      if (syncMode && e.key === ' ') {
        e.preventDefault()
        handleSyncTap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncMode, syncIndex, pendingTs])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Sync mode logic ───────────────────────────────────────────────────────

  function startSync() {
    // Initialize pending timestamps from existing data
    setPendingTs(nonEmptyLines.map((l) => ({ id: l.id, timestampMs: l.timestampMs ?? null })))
    setSyncIndex(0)
    setSyncMode(true)
  }

  function handleSyncTap() {
    if (syncIndex >= nonEmptyLines.length) return
    const line = nonEmptyLines[syncIndex]
    setPendingTs((prev) => {
      const next = [...prev]
      const idx = next.findIndex((p) => p.id === line.id)
      if (idx >= 0) next[idx] = { id: line.id, timestampMs: progressMs }
      else next.push({ id: line.id, timestampMs: progressMs })
      return next
    })
    setSyncIndex((i) => i + 1)
  }

  function handleSyncSkip() {
    setSyncIndex((i) => i + 1)
  }

  function handleSyncBack() {
    setSyncIndex((i) => Math.max(0, i - 1))
  }

  function handleSyncSave() {
    saveTimestamps.mutate(pendingTs)
  }

  // ── Theme / style helpers ─────────────────────────────────────────────────

  function set<K extends keyof ViewerSettings>(key: K, val: ViewerSettings[K]) {
    setS((prev) => {
      const next = { ...prev, [key]: val }
      try { localStorage.setItem(VIEWER_KEY, JSON.stringify(next)) } catch { /**/ }
      return next
    })
  }

  const isAuto      = s.theme === 'auto'
  const theme       = VIEWER_THEMES[s.theme]
  const fontStack   = VIEWER_FONTS[s.font].stack
  const lineHeight  = VIEWER_SPACINGS[s.spacing].lh
  const effectiveBg   = s.customBg   || (isAuto ? '' : theme.bg)
  const effectiveText = s.customText || (isAuto ? '' : theme.text)
  const borderColor   = isAuto ? 'var(--color-edge)' : theme.border
  const sheetStyle = {
    background: effectiveBg   || 'var(--color-surface-raised)',
    color:      effectiveText || 'var(--color-foreground)',
    fontFamily: fontStack,
  }
  const settingsStyle = { background: effectiveBg || 'var(--color-surface)', borderColor }
  const sizePillStyle = isAuto
    ? { background: 'var(--color-surface)', border: '1px solid var(--color-edge)' }
    : { background: theme.border + '44', border: `1px solid ${theme.border}` }

  function chipStyle(active: boolean) {
    if (active) return isAuto
      ? { background: 'var(--color-surface-overlay)', borderColor: 'var(--color-edge)', opacity: 1 }
      : { background: theme.border + '55', borderColor: theme.border, opacity: 1 }
    return { background: 'transparent', borderColor: 'transparent', opacity: 0.5 }
  }

  const sheetSizeClass = expanded
    ? 'w-full sm:max-w-4xl sm:mx-4 max-h-[96vh]'
    : 'w-full sm:max-w-2xl sm:mx-4 max-h-[88vh]'

  const pickerBg   = s.customBg   || theme.bg   || '#f9f9f7'
  const pickerText = s.customText || theme.text || '#0e0e0e'
  const displayArtist = artists?.join(', ') || artist

  // ── Progress bar (when karaoke / matching) ────────────────────────────────
  const songDuration = currentTrack?.item?.duration_ms ?? 0
  const progressPct = songDuration > 0 ? (progressMs / songDuration) * 100 : 0

  // ── Render ────────────────────────────────────────────────────────────────

  const syncDone = syncMode && syncIndex >= nonEmptyLines.length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={syncMode ? undefined : onClose} />

      {/* Sheet */}
      <div
        className={`relative z-10 ${sheetSizeClass} rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col transition-all duration-200`}
        style={{ ...sheetStyle, borderColor }}
      >
        {/* Drag handle — mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ background: borderColor + '66' }} />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b flex-shrink-0" style={{ borderColor }}>
          {imgUrl && (
            <img src={imgUrl} alt={track} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{track}</p>
            <p className="text-xs truncate" style={{ opacity: 0.5 }}>{displayArtist}</p>
            {authorLabel && (
              <p className="text-[10px] truncate mt-0.5" style={{ opacity: 0.4 }}>{authorLabel}</p>
            )}
          </div>

          {/* Song page link — shown when viewer opened from elsewhere (e.g. NowPlayingWidget) */}
          {spotifyId && location.pathname !== `/songs/${spotifyId}` && (
            <Link
              to={`/songs/${spotifyId}`}
              onClick={onClose}
              title="Song ansehen"
              className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg"
              style={{ opacity: 0.45 }}
            >
              <ArrowUpRight size={14} strokeWidth={1.75} />
            </Link>
          )}

          {/* Font size pill */}
          {!syncMode && (
            <div className="flex items-center flex-shrink-0 rounded-lg p-0.5" style={sizePillStyle}>
              <button onClick={() => set('fontSize', Math.max(0.65, +(s.fontSize - 0.15).toFixed(2)))} disabled={s.fontSize <= 0.65} aria-label="Verkleinern" className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-25">A−</button>
              <button onClick={() => set('fontSize', 1)} className="px-1.5 h-7 flex items-center text-[11px] tabular-nums min-w-[36px] justify-center" style={{ opacity: 0.55 }}>{Math.round(s.fontSize * 100)}%</button>
              <button onClick={() => set('fontSize', Math.min(2.5, +(s.fontSize + 0.15).toFixed(2)))} disabled={s.fontSize >= 2.5} aria-label="Vergrößern" className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-25">A+</button>
            </div>
          )}

          {/* Sync mode button — only when spotifyId + lines exist */}
          {!syncMode && spotifyId && nonEmptyLines.length > 0 && (
            <button
              onClick={startSync}
              aria-label="Sync-Modus"
              title="Timestamps synchronisieren"
              className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg"
              style={{ opacity: 0.45 }}
            >
              <Zap size={14} strokeWidth={1.75} />
            </button>
          )}

          {/* Settings toggle */}
          {!syncMode && (
            <button onClick={() => setShowSettings((v) => !v)} aria-label="Einstellungen" className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg" style={{ opacity: showSettings ? 1 : 0.45 }}>
              <SlidersHorizontal size={14} strokeWidth={1.75} />
            </button>
          )}

          {/* Expand toggle */}
          {!syncMode && (
            <button onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'Verkleinern' : 'Vergrößern'} className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg" style={{ opacity: 0.45 }}>
              {expanded ? <Minimize2 size={13} strokeWidth={1.75} /> : <Maximize2 size={13} strokeWidth={1.75} />}
            </button>
          )}

          {/* Close */}
          <button onClick={() => { if (syncMode) { setSyncMode(false); setSyncIndex(0); setPendingTs([]) } else onClose() }} aria-label="Schließen" className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg" style={{ opacity: 0.45 }}>
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Karaoke progress bar ── */}
        {isMatchingTrack && !syncMode && songDuration > 0 && (
          <div className="flex-shrink-0 h-0.5" style={{ background: borderColor + '44' }}>
            <div
              className="h-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${progressPct}%`, background: effectiveText || 'var(--color-accent)' , opacity: 0.4 }}
            />
          </div>
        )}

        {/* ── Settings panel ── */}
        {showSettings && !syncMode && (
          <div className="flex-shrink-0 px-4 py-3.5 border-b space-y-3" style={settingsStyle}>
            {/* Theme */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Thema</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_THEMES) as ViewerThemeKey[]).map((key) => {
                  const t = VIEWER_THEMES[key]
                  return (
                    <button key={key} onClick={() => set('theme', key)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border" style={chipStyle(s.theme === key)}>
                      <span className="w-3 h-3 rounded-full flex-shrink-0 border" style={{ background: key === 'auto' ? 'conic-gradient(#e0e0e0 180deg, #1a1a1a 180deg)' : t.swatch, borderColor: key === 'auto' ? 'var(--color-edge)' : t.swatch + 'cc' }} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Font */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Schrift</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_FONTS) as ViewerFont[]).map((key) => (
                  <button key={key} onClick={() => set('font', key)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border" style={{ ...chipStyle(s.font === key), fontFamily: VIEWER_FONTS[key].stack }}>{VIEWER_FONTS[key].label}</button>
                ))}
              </div>
            </div>
            {/* Spacing */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Abstand</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_SPACINGS) as ViewerSpacing[]).map((key) => (
                  <button key={key} onClick={() => set('spacing', key)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border" style={chipStyle(s.spacing === key)}>{VIEWER_SPACINGS[key].label}</button>
                ))}
              </div>
            </div>
            {/* Font weight */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Stärke</span>
              <div className="flex items-center gap-2.5">
                <input type="range" min="100" max="900" step="100" value={s.fontWeight} onChange={(e) => set('fontWeight', Number(e.target.value))} className="w-36 h-0.5 accent-current cursor-pointer" />
                <span className="text-[11px] tabular-nums w-8" style={{ opacity: 0.5 }}>{s.fontWeight}</span>
              </div>
            </div>
            {/* Custom colors */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Farben</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ opacity: 0.75 }}>
                  <input type="color" value={pickerBg} onChange={(e) => set('customBg', e.target.value)} className="w-5 h-5 rounded-full cursor-pointer p-0 border-0" />
                  BG
                  {s.customBg && <button onClick={() => set('customBg', '')} className="opacity-50 hover:opacity-100 transition-opacity"><X size={10} strokeWidth={2} /></button>}
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ opacity: 0.75 }}>
                  <input type="color" value={pickerText} onChange={(e) => set('customText', e.target.value)} className="w-5 h-5 rounded-full cursor-pointer p-0 border-0" />
                  Text
                  {s.customText && <button onClick={() => set('customText', '')} className="opacity-50 hover:opacity-100 transition-opacity"><X size={10} strokeWidth={2} /></button>}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Sync mode banner ── */}
        {syncMode && !syncDone && (
          <div className="flex-shrink-0 px-4 py-2.5 border-b text-center" style={{ borderColor }}>
            <p className="text-xs font-medium" style={{ opacity: 0.7 }}>
              Tippe auf die Zeile, wenn sie gesungen wird — oder drücke <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: borderColor + '44' }}>Leertaste</kbd>
            </p>
            <p className="text-[10px] mt-0.5" style={{ opacity: 0.4 }}>
              Zeile {syncIndex + 1} / {nonEmptyLines.length}
              {isPlaying && progressMs > 0 && (
                <span className="ml-2">· {formatMs(progressMs)}</span>
              )}
            </p>
          </div>
        )}

        {/* ── Main content ── */}
        <div className="flex-1 overflow-auto">
          {syncMode ? (
            // ─── Sync mode: tap-through lines ─────────────────────────────
            <div className="px-6 py-6 space-y-1">
              {syncDone ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <p className="text-sm font-medium" style={{ opacity: 0.8 }}>Alle Zeilen synchronisiert!</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSyncSave}
                      disabled={saveTimestamps.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: effectiveText || 'var(--color-foreground)', color: effectiveBg || 'var(--color-surface)' }}
                    >
                      <Check size={14} strokeWidth={2.5} />
                      {saveTimestamps.isPending ? 'Speichern…' : 'Timestamps speichern'}
                    </button>
                    <button
                      onClick={() => { setSyncMode(false); setSyncIndex(0); setPendingTs([]) }}
                      className="text-xs"
                      style={{ opacity: 0.5 }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                nonEmptyLines.map((line, idx) => {
                  const isCurrent = idx === syncIndex
                  const isDone = idx < syncIndex
                  const ts = pendingTs.find((p) => p.id === line.id)

                  return (
                    <div
                      key={line.id}
                      onClick={isCurrent ? handleSyncTap : undefined}
                      className={[
                        'rounded-lg px-3 py-2 transition-all',
                        isCurrent ? 'cursor-pointer' : '',
                      ].join(' ')}
                      style={{
                        background: isCurrent ? (effectiveText || 'var(--color-foreground)') + '15' : 'transparent',
                        opacity: isDone ? 0.35 : isCurrent ? 1 : 0.6,
                        fontSize: `${s.fontSize}rem`,
                        lineHeight,
                        fontWeight: isCurrent ? Math.min(s.fontWeight + 100, 900) : s.fontWeight,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1">{line.text}</span>
                        {ts?.timestampMs != null && (
                          <span className="text-[10px] tabular-nums flex-shrink-0" style={{ opacity: 0.4 }}>
                            {formatMs(ts.timestampMs)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : spotifyId && lines.length > 0 ? (
            // ─── Karaoke / structured mode ─────────────────────────────────
            <div className="px-6 py-6 space-y-0.5">
              {lines.map((line) => {
                const isActive = activeLineId === line.id
                const isEmpty = !line.text.trim()

                if (isEmpty) return <div key={line.id} className="h-4" />

                return (
                  <div
                    key={line.id}
                    ref={isActive ? activeLineRef : null}
                    className="rounded-lg px-2 -mx-2 py-0.5 transition-all duration-300"
                    style={{
                      fontSize: `${s.fontSize}rem`,
                      lineHeight,
                      fontWeight: isActive ? Math.min(s.fontWeight + 100, 900) : s.fontWeight,
                      opacity: activeLineId
                        ? isActive ? 1 : 0.35
                        : 1,
                      color: isActive ? (effectiveText || 'var(--color-foreground)') : undefined,
                    }}
                  >
                    {line.text}
                  </div>
                )
              })}
            </div>
          ) : (
            // ─── Plain text (fallback / reading mode) ─────────────────────
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              {(lyrics || songLyrics?.rawText) ? (
                <p
                  className="whitespace-pre-wrap"
                  style={{ fontSize: `${s.fontSize}rem`, lineHeight, fontWeight: s.fontWeight }}
                >
                  {lyrics || songLyrics?.rawText}
                </p>
              ) : (
                <p className="text-sm py-12 text-center" style={{ opacity: 0.4 }}>
                  Noch keine Lyrics gespeichert.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Sync mode bottom controls ── */}
        {syncMode && !syncDone && (
          <div className="flex-shrink-0 border-t flex items-center gap-2 px-4 py-3" style={{ borderColor }}>
            <button
              onClick={handleSyncBack}
              disabled={syncIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
              style={{ border: `1px solid ${borderColor}` }}
            >
              <ChevronLeft size={12} strokeWidth={2} />
              Zurück
            </button>
            <button
              onClick={handleSyncTap}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity active:opacity-70"
              style={{ background: effectiveText || 'var(--color-foreground)', color: effectiveBg || 'var(--color-surface)' }}
            >
              Jetzt ·&thinsp;{isPlaying && progressMs > 0 ? formatMs(progressMs) : '—'}
            </button>
            <button
              onClick={handleSyncSkip}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
              style={{ border: `1px solid ${borderColor}`, opacity: 0.6 }}
            >
              <SkipForward size={12} strokeWidth={2} />
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
