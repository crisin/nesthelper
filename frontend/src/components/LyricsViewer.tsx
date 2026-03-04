import { useState, useEffect } from 'react'
import { X, SlidersHorizontal, Maximize2, Minimize2 } from 'lucide-react'

// ─── Settings types & constants ───────────────────────────────────────────────

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

const VIEWER_THEMES: Record<
  ViewerThemeKey,
  { label: string; swatch: string; bg: string; text: string; border: string }
> = {
  auto: { label: 'Auto', swatch: '', bg: '', text: '', border: '' },
  dark: { label: 'Nacht',  swatch: '#151515', bg: '#0d0d0d', text: '#e8e8e8', border: '#2c2c2c' },
  warm: { label: 'Sepia',  swatch: '#c8a87a', bg: '#f2ece0', text: '#2a1a0a', border: '#d4c6aa' },
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
  } catch (e) { void e }
  return { theme: 'auto', font: 'sans', spacing: 'normal', fontSize: 1, fontWeight: 400, customBg: '', customText: '' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface LyricsViewerProps {
  track:        string
  artist:       string
  artists?:     string[]
  imgUrl?:      string | null
  lyrics:       string
  onClose:      () => void
  /** Optional label shown below the artist, e.g. "von @Username" */
  authorLabel?: string
}

export default function LyricsViewer({
  track, artist, artists, imgUrl, lyrics, onClose, authorLabel,
}: LyricsViewerProps) {
  const [s, setS] = useState<ViewerSettings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function set<K extends keyof ViewerSettings>(key: K, val: ViewerSettings[K]) {
    setS((prev) => {
      const next = { ...prev, [key]: val }
      try { localStorage.setItem(VIEWER_KEY, JSON.stringify(next)) } catch { /**/ }
      return next
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const isAuto     = s.theme === 'auto'
  const theme      = VIEWER_THEMES[s.theme]
  const fontStack  = VIEWER_FONTS[s.font].stack
  const lineHeight = VIEWER_SPACINGS[s.spacing].lh

  const effectiveBg   = s.customBg   || (isAuto ? '' : theme.bg)
  const effectiveText = s.customText || (isAuto ? '' : theme.text)
  const borderColor   = isAuto ? 'var(--color-edge)' : theme.border

  const sheetStyle = {
    background: effectiveBg   || 'var(--color-surface-raised)',
    color:      effectiveText || 'var(--color-foreground)',
    fontFamily: fontStack,
  }

  const settingsStyle = {
    background:  effectiveBg || 'var(--color-surface)',
    borderColor: borderColor,
  }

  const sizePillStyle = isAuto
    ? { background: 'var(--color-surface)', border: '1px solid var(--color-edge)' }
    : { background: theme.border + '44',    border: `1px solid ${theme.border}` }

  function chipStyle(active: boolean) {
    if (active) {
      return isAuto
        ? { background: 'var(--color-surface-overlay)', borderColor: 'var(--color-edge)', opacity: 1 }
        : { background: theme.border + '55',            borderColor: theme.border,        opacity: 1 }
    }
    return { background: 'transparent', borderColor: 'transparent', opacity: 0.5 }
  }

  const sheetSizeClass = expanded
    ? 'w-full sm:max-w-4xl sm:mx-4 max-h-[96vh]'
    : 'w-full sm:max-w-2xl sm:mx-4 max-h-[88vh]'

  const pickerBg   = s.customBg   || theme.bg   || '#f9f9f7'
  const pickerText = s.customText || theme.text || '#0e0e0e'

  const displayArtist = artists?.join(', ') || artist

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

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

          {/* Font size pill */}
          <div className="flex items-center flex-shrink-0 rounded-lg p-0.5" style={sizePillStyle}>
            <button
              onClick={() => set('fontSize', Math.max(0.65, +(s.fontSize - 0.15).toFixed(2)))}
              disabled={s.fontSize <= 0.65}
              aria-label="Verkleinern"
              className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-25"
            >A−</button>
            <button
              onClick={() => set('fontSize', 1)}
              className="px-1.5 h-7 flex items-center text-[11px] tabular-nums min-w-[36px] justify-center"
              style={{ opacity: 0.55 }}
            >{Math.round(s.fontSize * 100)}%</button>
            <button
              onClick={() => set('fontSize', Math.min(2.5, +(s.fontSize + 0.15).toFixed(2)))}
              disabled={s.fontSize >= 2.5}
              aria-label="Vergrößern"
              className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-25"
            >A+</button>
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Einstellungen"
            className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg"
            style={{ opacity: showSettings ? 1 : 0.45 }}
          >
            <SlidersHorizontal size={14} strokeWidth={1.75} />
          </button>

          {/* Expand toggle — desktop only */}
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Verkleinern' : 'Vergrößern'}
            className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg"
            style={{ opacity: 0.45 }}
          >
            {expanded ? <Minimize2 size={13} strokeWidth={1.75} /> : <Maximize2 size={13} strokeWidth={1.75} />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ opacity: 0.45 }}
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Settings panel ── */}
        {showSettings && (
          <div className="flex-shrink-0 px-4 py-3.5 border-b space-y-3" style={settingsStyle}>
            {/* Theme */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Thema</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_THEMES) as ViewerThemeKey[]).map((key) => {
                  const t = VIEWER_THEMES[key]
                  return (
                    <button key={key} onClick={() => set('theme', key)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                      style={chipStyle(s.theme === key)}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0 border" style={{
                        background: key === 'auto' ? 'conic-gradient(#e0e0e0 180deg, #1a1a1a 180deg)' : t.swatch,
                        borderColor: key === 'auto' ? 'var(--color-edge)' : t.swatch + 'cc',
                      }} />
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
                {(Object.keys(VIEWER_FONTS) as ViewerFont[]).map((key) => {
                  const f = VIEWER_FONTS[key]
                  return (
                    <button key={key} onClick={() => set('font', key)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                      style={{ ...chipStyle(s.font === key), fontFamily: f.stack }}
                    >{f.label}</button>
                  )
                })}
              </div>
            </div>

            {/* Spacing */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Abstand</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_SPACINGS) as ViewerSpacing[]).map((key) => {
                  const sp = VIEWER_SPACINGS[key]
                  return (
                    <button key={key} onClick={() => set('spacing', key)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                      style={chipStyle(s.spacing === key)}
                    >{sp.label}</button>
                  )
                })}
              </div>
            </div>

            {/* Font weight */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Stärke</span>
              <div className="flex items-center gap-2.5">
                <input type="range" min="100" max="900" step="100"
                  value={s.fontWeight}
                  onChange={(e) => set('fontWeight', Number(e.target.value))}
                  className="w-36 h-0.5 accent-current cursor-pointer"
                />
                <span className="text-[11px] tabular-nums w-8" style={{ opacity: 0.5 }}>{s.fontWeight}</span>
              </div>
            </div>

            {/* Custom colors */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Farben</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ opacity: 0.75 }}>
                  <input type="color" value={pickerBg}
                    onChange={(e) => set('customBg', e.target.value)}
                    className="w-5 h-5 rounded-full cursor-pointer p-0 border-0"
                  />
                  BG
                  {s.customBg && (
                    <button onClick={() => set('customBg', '')} className="opacity-50 hover:opacity-100 transition-opacity">
                      <X size={10} strokeWidth={2} />
                    </button>
                  )}
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ opacity: 0.75 }}>
                  <input type="color" value={pickerText}
                    onChange={(e) => set('customText', e.target.value)}
                    className="w-5 h-5 rounded-full cursor-pointer p-0 border-0"
                  />
                  Text
                  {s.customText && (
                    <button onClick={() => set('customText', '')} className="opacity-50 hover:opacity-100 transition-opacity">
                      <X size={10} strokeWidth={2} />
                    </button>
                  )}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Lyrics ── */}
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {lyrics ? (
              <p
                className="whitespace-pre-wrap"
                style={{ fontSize: `${s.fontSize}rem`, lineHeight, fontWeight: s.fontWeight }}
              >
                {lyrics}
              </p>
            ) : (
              <p className="text-sm py-12 text-center" style={{ opacity: 0.4 }}>
                Noch keine Lyrics gespeichert.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
