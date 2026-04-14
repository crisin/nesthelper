// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewerFont     = 'sans' | 'serif' | 'mono'
export type ViewerSpacing  = 'tight' | 'normal' | 'relaxed' | 'loose'
export type ViewerThemeKey = 'auto' | 'dark' | 'warm' | 'slate'
export type ViewerBgMode   = 'solid' | 'cover' | 'ambient'
export type ViewerTextAlign = 'left' | 'center'

export interface ViewerSettings {
  // Typography
  font:            ViewerFont
  fontSize:        number        // 0.65 – 2.5 rem
  fontWeight:      number        // 100 – 900
  spacing:         ViewerSpacing
  textAlign:       ViewerTextAlign
  letterSpacing:   number        // 0 – 0.12 em

  // Color / theme
  theme:           ViewerThemeKey
  customBg:        string        // hex, overrides theme bg (solid mode only)
  customText:      string        // hex, overrides theme text

  // Background effects
  bgMode:          ViewerBgMode
  bgBlur:          number        // 0 – 48 px
  bgDim:           number        // 0 – 0.95 (dim overlay / image intensity)

  // Text / line effects
  inactiveOpacity: number        // 0 – 1, default 0.35 (when karaoke active)
  activeGlow:      boolean       // text-shadow on active karaoke line
  showSections:    boolean       // render section labels (Verse/Chorus/Bridge)
}

export type ViewerSettingsSetter = <K extends keyof ViewerSettings>(
  key: K,
  val: ViewerSettings[K],
) => void

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: ViewerSettings = {
  font:            'sans',
  fontSize:        1,
  fontWeight:      400,
  spacing:         'normal',
  textAlign:       'left',
  letterSpacing:   0,
  theme:           'auto',
  customBg:        '',
  customText:      '',
  bgMode:          'solid',
  bgBlur:          20,
  bgDim:           0.5,
  inactiveOpacity: 0.35,
  activeGlow:      false,
  showSections:    true,
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const VIEWER_THEMES: Record<
  ViewerThemeKey,
  { label: string; swatch: string; bg: string; text: string; border: string }
> = {
  auto:  { label: 'Auto',  swatch: '',        bg: '',        text: '',        border: '' },
  dark:  { label: 'Nacht', swatch: '#151515', bg: '#0d0d0d', text: '#e8e8e8', border: '#2c2c2c' },
  warm:  { label: 'Sepia', swatch: '#c8a87a', bg: '#f2ece0', text: '#2a1a0a', border: '#d4c6aa' },
  slate: { label: 'Slate', swatch: '#3a4f7a', bg: '#1a2035', text: '#bfcde0', border: '#253050' },
}

export const VIEWER_FONTS: Record<ViewerFont, { label: string; stack: string }> = {
  sans:  { label: 'Sans',  stack: 'Inter, system-ui, sans-serif' },
  serif: { label: 'Serif', stack: "Georgia, 'Times New Roman', serif" },
  mono:  { label: 'Mono',  stack: "'Courier New', Courier, monospace" },
}

export const VIEWER_SPACINGS: Record<ViewerSpacing, { label: string; lh: number }> = {
  tight:   { label: 'Eng',    lh: 1.45 },
  normal:  { label: 'Normal', lh: 1.75 },
  relaxed: { label: 'Weit',   lh: 2.1  },
  loose:   { label: 'Locker', lh: 2.6  },
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lyrics-viewer-settings'
const WIDTH_KEY   = 'lyrics-viewer-width'

/** Merges saved data with current defaults — safe for schema migrations. */
function loadSettings(): ViewerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /**/ }
  return { ...DEFAULTS }
}

export function loadPanelWidth(defaultWidth = 672): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY)
    if (raw) return Math.max(380, Math.min(1200, parseInt(raw, 10)))
  } catch { /**/ }
  return defaultWidth
}

export function savePanelWidth(w: number) {
  try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /**/ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

import { useState } from 'react'

export function useViewerSettings() {
  const [s, setS] = useState<ViewerSettings>(loadSettings)

  const set: ViewerSettingsSetter = (key, val) => {
    setS((prev) => {
      const next = { ...prev, [key]: val }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /**/ }
      return next
    })
  }

  function reset() {
    setS({ ...DEFAULTS })
    try { localStorage.removeItem(STORAGE_KEY) } catch { /**/ }
  }

  return { s, set, reset }
}

// ─── Derived style helpers ────────────────────────────────────────────────────

/** Compute all CSS values needed to render the viewer, given current settings. */
export function computeViewerStyle(s: ViewerSettings) {
  const isAuto      = s.theme === 'auto'
  const theme       = VIEWER_THEMES[s.theme]
  const fontStack   = VIEWER_FONTS[s.font].stack
  const lineHeight  = VIEWER_SPACINGS[s.spacing].lh

  const effectiveBg   = s.customBg   || (isAuto ? '' : theme.bg)
  const effectiveText = s.customText || (isAuto ? '' : theme.text)
  const borderColor   = isAuto ? 'var(--color-edge)' : theme.border

  // Background: image layer is used when bgMode !== 'solid'
  const sheetBg = s.bgMode === 'cover'
    ? '#000'  // dark fallback visible at blur edges
    : effectiveBg || 'var(--color-surface-raised)'

  // When cover/ambient: settings panel gets a frosted dark overlay
  const isOverlay     = s.bgMode !== 'solid'
  const overlayPanelBg   = 'rgba(0,0,0,0.72)'
  const overlayPanelText = '#fff'
  const overlayBorder    = 'rgba(255,255,255,0.12)'

  return {
    isAuto,
    theme,
    fontStack,
    lineHeight,
    effectiveBg,
    effectiveText,
    borderColor,
    sheetBg,
    isOverlay,
    overlayPanelBg,
    overlayPanelText,
    overlayBorder,
    letterSpacing: s.letterSpacing ? `${s.letterSpacing}em` : undefined,
  }
}
