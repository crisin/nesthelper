// ─── Types ────────────────────────────────────────────────────────────────────
// The settings themselves live in the per-user settings store (`viewer` section).

import {
  useSettingsStore,
  type ViewerFont,
  type ViewerSettings,
  type ViewerSpacing,
  type ViewerThemeKey,
} from '../stores/settingsStore'

export type {
  ViewerBgMode,
  ViewerFont,
  ViewerSettings,
  ViewerSpacing,
  ViewerTextAlign,
  ViewerThemeKey,
} from '../stores/settingsStore'

export type ViewerSettingsSetter = <K extends keyof ViewerSettings>(
  key: K,
  val: ViewerSettings[K],
) => void

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

// ─── Panel width ──────────────────────────────────────────────────────────────
// Deliberately browser-local: it depends on the screen, not on the person.

const WIDTH_KEY   = 'lyrics-viewer-width'

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

export function useViewerSettings() {
  const s = useSettingsStore((st) => st.viewer)
  const update = useSettingsStore((st) => st.update)
  const resetSection = useSettingsStore((st) => st.resetSection)

  const set: ViewerSettingsSetter = (key, val) => update('viewer', { [key]: val })

  function reset() {
    resetSection('viewer')
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
