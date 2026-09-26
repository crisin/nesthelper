import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, SlidersHorizontal, Maximize2, Minimize2, Zap, Check,
  SkipForward, ChevronLeft, ArrowUpRight,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import api from '../services/api'
import type { SongLyrics, LyricsSection } from '../types'
import {
  useViewerSettings,
  computeViewerStyle,
  loadPanelWidth,
  savePanelWidth,
} from '../hooks/useViewerSettings'
import ViewerSettingsPanel from './ViewerSettingsPanel'
import {
  interpolateProgress,
  readProgressMs,
  useNowPlaying,
  useProgressTick,
} from '../hooks/useNowPlaying'
import { formatMs } from '../lib/format'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Module-level const — evaluated once at import (intentional, matches project convention)
const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({
  label, isOverlay, borderColor,
}: {
  label: string
  isOverlay: boolean
  borderColor: string
}) {
  return (
    <div
      className="flex items-center gap-2 mt-5 mb-1 first:mt-0"
      aria-label={`Abschnitt: ${label}`}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ opacity: 0.38, color: isOverlay ? '#fff' : 'inherit' }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: isOverlay ? 'rgba(255,255,255,0.12)' : borderColor, opacity: 0.5 }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LyricsViewer({
  track, artist, artists, imgUrl, lyrics, onClose, authorLabel, spotifyId,
}: LyricsViewerProps) {
  const queryClient = useQueryClient()
  const location    = useLocation()

  // ── Settings ────────────────────────────────────────────────────────────
  const { s, set, reset } = useViewerSettings()

  // ── Local state ──────────────────────────────────────────────────────────
  const [showSettings,       setShowSettings]       = useState(false)
  const [showMobileSettings, setShowMobileSettings] = useState(false)
  const [fullscreen,         setFullscreen]          = useState(false)

  // Sync mode
  const [syncMode,   setSyncMode]   = useState(false)
  const [syncIndex,  setSyncIndex]  = useState(0)
  const [pendingTs,  setPendingTs]  = useState<{ id: string; timestampMs: number | null }[]>([])

  // Panel width (desktop)
  const panelWidthRef = useRef(loadPanelWidth())
  const [panelWidth,  setPanelWidth] = useState(panelWidthRef.current)

  const activeLineRef = useRef<HTMLDivElement | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: songLyrics } = useQuery<SongLyrics | null>({
    queryKey: ['lyrics', spotifyId],
    queryFn:  () => api.get<SongLyrics | null>(`/songs/${spotifyId}/lyrics`).then((r) => r.data),
    enabled:  !!spotifyId,
    staleTime: 60_000,
  })

  // Between polls the position is interpolated locally, so even sync mode only
  // needs a drift check every few seconds; otherwise AppLayout's poll suffices.
  const { data: currentTrack, dataUpdatedAt } = useNowPlaying({
    fast: true,
    poll: !!spotifyId && syncMode,
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

  const isMatchingTrack = !!spotifyId && currentTrack?.item?.id === spotifyId
  const isPlaying       = currentTrack?.is_playing ?? false
  useProgressTick(isMatchingTrack && isPlaying, 250)
  const progressMs      = interpolateProgress(currentTrack, dataUpdatedAt)

  const lines        = useMemo(() => songLyrics?.lines    ?? [], [songLyrics])
  const sections     = useMemo(() => songLyrics?.sections ?? [], [songLyrics])
  const nonEmptyLines = lines.filter((l) => l.text.trim())
  const hasTimestamps = nonEmptyLines.some((l) => l.timestampMs != null)

  /** Map lineNumber → section for fast lookup in render */
  const sectionByLine = useMemo(() => {
    const map = new Map<number, LyricsSection>()
    for (const sec of sections) map.set(sec.startLine, sec)
    return map
  }, [sections])

  /** Active karaoke line id */
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

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') {
        if (showMobileSettings) { setShowMobileSettings(false); return }
        if (syncMode) { setSyncMode(false); setSyncIndex(0); setPendingTs([]); return }
        if (fullscreen) { setFullscreen(false); return }
        onClose()
      }
      if ((e.key === 'f' || e.key === 'F') && !syncMode) setFullscreen((v) => !v)
      if (syncMode && e.key === ' ') { e.preventDefault(); handleSyncTap() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncMode, syncIndex, pendingTs, fullscreen, showMobileSettings])

  // ── Resize handle (desktop) ───────────────────────────────────────────────

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = panelWidthRef.current
    const onMove = (me: MouseEvent) => {
      const newW = Math.max(380, Math.min(window.innerWidth - 32, startW + me.clientX - startX))
      panelWidthRef.current = newW
      setPanelWidth(newW)
    }
    const onUp = () => {
      savePanelWidth(panelWidthRef.current)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  // ── Sync mode logic ───────────────────────────────────────────────────────

  function startSync() {
    setPendingTs(nonEmptyLines.map((l) => ({ id: l.id, timestampMs: l.timestampMs ?? null })))
    setSyncIndex(0)
    setSyncMode(true)
  }

  function handleSyncTap() {
    if (syncIndex >= nonEmptyLines.length) return
    const line = nonEmptyLines[syncIndex]
    // Read at tap time, not from the last render — up to a tick more precise.
    const tapMs = readProgressMs(queryClient)
    setPendingTs((prev) => {
      const next = [...prev]
      const idx  = next.findIndex((p) => p.id === line.id)
      if (idx >= 0) next[idx] = { id: line.id, timestampMs: tapMs }
      else next.push({ id: line.id, timestampMs: tapMs })
      return next
    })
    setSyncIndex((i) => i + 1)
  }

  function handleSyncSkip()  { setSyncIndex((i) => i + 1) }
  function handleSyncBack()  { setSyncIndex((i) => Math.max(0, i - 1)) }
  function handleSyncSave()  { saveTimestamps.mutate(pendingTs) }

  // ── Derived style ─────────────────────────────────────────────────────────

  const computed = computeViewerStyle(s)
  const {
    effectiveBg, effectiveText, borderColor, sheetBg,
    isOverlay, fontStack, lineHeight, letterSpacing,
    overlayPanelBg, overlayPanelText, overlayBorder,
  } = computed

  const displayArtist = artists?.join(', ') || artist

  const sheetTextColor = effectiveText || (isOverlay ? '#fff' : 'var(--color-foreground)')

  const sheetStyle: React.CSSProperties = {
    background: sheetBg,
    color:      sheetTextColor,
    fontFamily: fontStack,
  }

  const sheetBorderColor = s.bgMode === 'solid' ? borderColor : 'transparent'

  const sheetClass = fullscreen
    ? 'absolute inset-0 z-10 flex flex-col overflow-hidden'
    : 'relative z-10 w-full sm:mx-4 rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col overflow-hidden'

  const sheetDimensionStyle: React.CSSProperties = fullscreen
    ? {}
    : isDesktop
      ? { width: panelWidth, maxWidth: 'calc(100vw - 32px)', maxHeight: '88vh' }
      : { maxHeight: '88vh' }

  // Header button style — adapts to overlay/dark bg
  const headerBtnStyle: React.CSSProperties = {
    opacity: 0.45,
    color: isOverlay ? '#fff' : 'inherit',
  }

  // Settings panel bg (desktop inline panel)
  const settingsPanelStyle: React.CSSProperties = isOverlay
    ? { background: overlayPanelBg, borderColor: overlayBorder, color: overlayPanelText }
    : { background: effectiveBg || 'var(--color-surface)', borderColor }

  // Progress bar
  const songDuration = currentTrack?.item?.duration_ms ?? 0
  const progressPct  = songDuration > 0 ? (progressMs / songDuration) * 100 : 0

  const syncDone = syncMode && syncIndex >= nonEmptyLines.length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55"
        onClick={syncMode || showMobileSettings ? undefined : onClose}
      />

      {/* Sheet */}
      <div
        className={sheetClass}
        style={{ ...sheetStyle, borderColor: sheetBorderColor, ...sheetDimensionStyle }}
      >
        {/* ── Background image layer (cover / ambient) ── */}
        {s.bgMode !== 'solid' && imgUrl && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
            <img
              src={imgUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{
                filter: `blur(${s.bgMode === 'ambient' ? Math.max(s.bgBlur, 24) : s.bgBlur}px) saturate(110%)`,
                transform: 'scale(1.08)', // prevents blur edge artifacts
                opacity: s.bgMode === 'ambient' ? Math.min(0.6, s.bgDim + 0.1) : 1,
              }}
            />
            {s.bgMode === 'cover' && (
              <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${s.bgDim})` }} />
            )}
          </div>
        )}

        {/* ── Resize handle — desktop only, not fullscreen ── */}
        {!fullscreen && (
          <div
            className="absolute top-0 right-0 bottom-0 w-3 cursor-col-resize select-none hidden sm:block z-20"
            onMouseDown={onResizeStart}
            title="Breite anpassen"
          >
            <div
              className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-10 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-150"
              style={{ background: borderColor }}
            />
          </div>
        )}

        {/* ── All content — sits above the bg image layer ── */}
        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">

          {/* Drag handle — mobile, not fullscreen */}
          {!fullscreen && (
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-8 h-1 rounded-full" style={{ background: borderColor + '66' }} />
            </div>
          )}

          {/* ── Header ── */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: isOverlay ? 'rgba(255,255,255,0.1)' : borderColor }}
          >
            {imgUrl && !isOverlay && (
              <img src={imgUrl} alt={track} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{track}</p>
              <p className="text-xs truncate" style={{ opacity: 0.5 }}>{displayArtist}</p>
              {authorLabel && (
                <p className="text-[10px] truncate mt-0.5" style={{ opacity: 0.4 }}>{authorLabel}</p>
              )}
            </div>

            {/* Song page link */}
            {spotifyId && location.pathname !== `/songs/${spotifyId}` && (
              <Link
                to={`/songs/${spotifyId}`}
                onClick={onClose}
                title="Song ansehen"
                aria-label="Song ansehen"
                /* Was desktop-only, but on a phone the fullscreen viewer covers
                   everything — this is the only way out to the song page. */
                className="flex flex-shrink-0 w-9 h-9 sm:w-7 sm:h-7 items-center justify-center rounded-lg hover:opacity-80 transition-opacity"
                style={headerBtnStyle}
              >
                <ArrowUpRight size={14} strokeWidth={1.75} />
              </Link>
            )}

            {/* Font size pill — header quick-access */}
            {!syncMode && (
              <div
                className="flex items-center flex-shrink-0 rounded-lg p-0.5"
                style={isOverlay
                  ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }
                  : { background: 'var(--color-surface)', border: `1px solid ${borderColor}` }
                }
              >
                <button
                  onClick={() => set('fontSize', Math.max(0.65, +(s.fontSize - 0.1).toFixed(2)))}
                  disabled={s.fontSize <= 0.65}
                  aria-label="Verkleinern"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-25"
                  style={{ color: isOverlay ? '#fff' : 'inherit' }}
                >
                  A−
                </button>
                <button
                  onClick={() => set('fontSize', 1)}
                  className="px-1.5 h-7 flex items-center text-[11px] tabular-nums min-w-[36px] justify-center"
                  style={{ opacity: 0.55, color: isOverlay ? '#fff' : 'inherit' }}
                >
                  {Math.round(s.fontSize * 100)}%
                </button>
                <button
                  onClick={() => set('fontSize', Math.min(2.5, +(s.fontSize + 0.1).toFixed(2)))}
                  disabled={s.fontSize >= 2.5}
                  aria-label="Vergrößern"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-25"
                  style={{ color: isOverlay ? '#fff' : 'inherit' }}
                >
                  A+
                </button>
              </div>
            )}

            {/* Sync mode button */}
            {!syncMode && spotifyId && nonEmptyLines.length > 0 && (
              <button
                onClick={startSync}
                aria-label="Sync-Modus"
                title="Timestamps synchronisieren"
                className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg hover:opacity-80 transition-opacity"
                style={headerBtnStyle}
              >
                <Zap size={14} strokeWidth={1.75} />
              </button>
            )}

            {/* Settings — desktop */}
            {!syncMode && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                aria-label="Einstellungen"
                className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg hover:opacity-80 transition-opacity"
                style={{ ...headerBtnStyle, opacity: showSettings ? 0.9 : 0.45 }}
              >
                <SlidersHorizontal size={14} strokeWidth={1.75} />
              </button>
            )}

            {/* Settings — mobile */}
            {!syncMode && (
              <button
                onClick={() => setShowMobileSettings((v) => !v)}
                aria-label="Einstellungen"
                className="sm:hidden flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ ...headerBtnStyle, opacity: showMobileSettings ? 0.9 : 0.45 }}
              >
                <SlidersHorizontal size={14} strokeWidth={1.75} />
              </button>
            )}

            {/* Fullscreen toggle */}
            {!syncMode && (
              <button
                onClick={() => setFullscreen((v) => !v)}
                aria-label={fullscreen ? 'Vollbild verlassen' : 'Vollbild'}
                title={fullscreen ? 'Vollbild verlassen (F)' : 'Vollbild (F)'}
                className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg hover:opacity-80 transition-opacity"
                style={{ ...headerBtnStyle, opacity: fullscreen ? 0.8 : 0.45 }}
              >
                {fullscreen ? <Minimize2 size={13} strokeWidth={1.75} /> : <Maximize2 size={13} strokeWidth={1.75} />}
              </button>
            )}

            {/* Close */}
            <button
              onClick={() => {
                if (syncMode) { setSyncMode(false); setSyncIndex(0); setPendingTs([]) }
                else onClose()
              }}
              aria-label="Schließen"
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-80 transition-opacity"
              style={headerBtnStyle}
            >
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>

          {/* ── Karaoke progress bar ── */}
          {isMatchingTrack && !syncMode && songDuration > 0 && (
            <div
              className="flex-shrink-0 h-0.5"
              style={{ background: (isOverlay ? 'rgba(255,255,255,0.12)' : borderColor) + '44' }}
            >
              <div
                className="h-full transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${progressPct}%`,
                  background: isOverlay ? 'rgba(255,255,255,0.6)' : (effectiveText || 'var(--color-accent)'),
                  opacity: 0.5,
                }}
              />
            </div>
          )}

          {/* ── Desktop settings panel ── */}
          {showSettings && !syncMode && (
            <div
              className="flex-shrink-0 px-4 py-4 border-b hidden sm:block"
              style={settingsPanelStyle}
            >
              <ViewerSettingsPanel
                s={s}
                set={set}
                reset={reset}
                imgUrl={imgUrl}
                isOverlay={isOverlay}
                borderColor={borderColor}
              />
            </div>
          )}

          {/* ── Sync mode banner ── */}
          {syncMode && !syncDone && (
            <div className="flex-shrink-0 px-4 py-2.5 border-b text-center" style={{ borderColor: isOverlay ? 'rgba(255,255,255,0.1)' : borderColor }}>
              <p className="text-xs font-medium" style={{ opacity: 0.7 }}>
                Tippe auf die Zeile, wenn sie gesungen wird — oder drücke{' '}
                <kbd
                  className="px-1 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: isOverlay ? 'rgba(255,255,255,0.12)' : borderColor + '44' }}
                >
                  Leertaste
                </kbd>
              </p>
              <p className="text-[10px] mt-0.5" style={{ opacity: 0.4 }}>
                Zeile {syncIndex + 1} / {nonEmptyLines.length}
                {isPlaying && progressMs > 0 && (
                  <span className="ml-2">· {formatMs(progressMs)}</span>
                )}
              </p>
            </div>
          )}

          {/* ── Main lyrics content ── */}
          <div className="flex-1 overflow-auto">
            {syncMode ? (
              // ─── Sync mode: tap-through ───────────────────────────────
              <div className="px-6 py-6 space-y-1">
                {syncDone ? (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <p className="text-sm font-medium" style={{ opacity: 0.8 }}>
                      Alle Zeilen synchronisiert!
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSyncSave}
                        disabled={saveTimestamps.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{
                          background: isOverlay ? 'rgba(255,255,255,0.9)' : (effectiveText || 'var(--color-foreground)'),
                          color:      isOverlay ? '#000' : (effectiveBg || 'var(--color-surface)'),
                        }}
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
                    const isDone    = idx < syncIndex
                    const ts        = pendingTs.find((p) => p.id === line.id)
                    return (
                      <div
                        key={line.id}
                        onClick={isCurrent ? handleSyncTap : undefined}
                        className={['rounded-lg px-3 py-2 transition-all', isCurrent ? 'cursor-pointer' : ''].join(' ')}
                        style={{
                          background:  isCurrent ? (isOverlay ? 'rgba(255,255,255,0.12)' : (effectiveText || 'var(--color-foreground)') + '15') : 'transparent',
                          opacity:     isDone ? 0.35 : isCurrent ? 1 : 0.6,
                          fontSize:    `${s.fontSize}rem`,
                          lineHeight,
                          fontWeight:  isCurrent ? Math.min(s.fontWeight + 100, 900) : s.fontWeight,
                          textAlign:   s.textAlign,
                          letterSpacing,
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
              // ─── Karaoke / structured mode ─────────────────────────────
              <div
                className="px-6 py-6 space-y-0.5"
                style={{ textAlign: s.textAlign }}
              >
                {lines.map((line) => {
                  const isActive  = activeLineId === line.id
                  const isEmpty   = !line.text.trim()
                  const section   = sectionByLine.get(line.lineNumber)

                  if (isEmpty) return (
                    <div key={line.id}>
                      {s.showSections && section && (
                        <SectionLabel label={section.label} isOverlay={isOverlay} borderColor={borderColor} />
                      )}
                      <div className="h-4" />
                    </div>
                  )

                  const lineOpacity = activeLineId
                    ? isActive ? 1 : s.inactiveOpacity
                    : 1

                  const glowStyle = s.activeGlow && isActive
                    ? { textShadow: '0 0 24px currentColor, 0 0 8px currentColor' }
                    : {}

                  return (
                    <div key={line.id}>
                      {s.showSections && section && (
                        <SectionLabel label={section.label} isOverlay={isOverlay} borderColor={borderColor} />
                      )}
                      <div
                        ref={isActive ? activeLineRef : null}
                        className="rounded-lg px-2 -mx-2 py-0.5 transition-all duration-300"
                        style={{
                          fontSize:     `${s.fontSize}rem`,
                          lineHeight,
                          fontWeight:   isActive ? Math.min(s.fontWeight + 100, 900) : s.fontWeight,
                          opacity:      lineOpacity,
                          letterSpacing,
                          ...glowStyle,
                        }}
                      >
                        {line.text}
                      </div>
                    </div>
                  )
                })}
              </div>

            ) : (
              // ─── Plain text (fallback / reading mode) ──────────────────
              <div
                className="px-6 py-6 sm:px-8 sm:py-8"
                style={{ textAlign: s.textAlign }}
              >
                {(lyrics || songLyrics?.rawText) ? (
                  <p
                    className="whitespace-pre-wrap"
                    style={{
                      fontSize:     `${s.fontSize}rem`,
                      lineHeight,
                      fontWeight:   s.fontWeight,
                      letterSpacing,
                    }}
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
            <div
              className="flex-shrink-0 border-t flex items-center gap-2 px-4 py-3"
              style={{ borderColor: isOverlay ? 'rgba(255,255,255,0.1)' : borderColor }}
            >
              <button
                onClick={handleSyncBack}
                disabled={syncIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
                style={{ border: `1px solid ${isOverlay ? 'rgba(255,255,255,0.2)' : borderColor}` }}
              >
                <ChevronLeft size={12} strokeWidth={2} />
                Zurück
              </button>
              <button
                onClick={handleSyncTap}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity active:opacity-70"
                style={{
                  background: isOverlay ? 'rgba(255,255,255,0.9)' : (effectiveText || 'var(--color-foreground)'),
                  color:      isOverlay ? '#000' : (effectiveBg || 'var(--color-surface)'),
                }}
              >
                Jetzt ·&thinsp;{isPlaying && progressMs > 0 ? formatMs(progressMs) : '—'}
              </button>
              <button
                onClick={handleSyncSkip}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                style={{ border: `1px solid ${isOverlay ? 'rgba(255,255,255,0.2)' : borderColor}`, opacity: 0.6 }}
              >
                <SkipForward size={12} strokeWidth={2} />
                Skip
              </button>
            </div>
          )}

        </div>{/* end content wrapper */}

        {/* ── Mobile settings panel — slides up inside the sheet ── */}
        {showMobileSettings && !syncMode && (
          <>
            {/* Tap-outside to close */}
            <div
              className="sm:hidden absolute inset-0 z-20"
              onClick={() => setShowMobileSettings(false)}
            />
            <div
              className="sm:hidden absolute inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-6 max-h-[65vh] overflow-auto"
              style={isOverlay
                ? { background: overlayPanelBg, borderColor: overlayBorder, color: overlayPanelText }
                : { background: effectiveBg || 'var(--color-surface)', borderColor }
              }
            >
              {/* Drag indicator */}
              <div className="flex justify-center mb-3">
                <div className="w-8 h-1 rounded-full" style={{ background: isOverlay ? 'rgba(255,255,255,0.2)' : borderColor }} />
              </div>
              <ViewerSettingsPanel
                s={s}
                set={set}
                reset={reset}
                imgUrl={imgUrl}
                isOverlay={isOverlay}
                borderColor={isOverlay ? 'rgba(255,255,255,0.2)' : borderColor}
              />
            </div>
          </>
        )}

      </div>{/* end sheet */}
    </div>
  )
}
