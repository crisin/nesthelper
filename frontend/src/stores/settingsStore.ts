import { create } from 'zustand'
import api from '../services/api'
import { logError } from '../lib/errors'

// ─── Section types ────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark'
export type SearchMode = 'open' | 'save'
export type LibraryLayout = 'list' | 'grid'

export type VisualMode = 'blur' | 'ambient' | 'both'
export type VisualizerStyle = 'pulse' | 'breathe'

export interface VisualSettings {
  enabled: boolean
  pages: Record<string, boolean>
  mode: VisualMode
  blurAmount: number        // 8–40px
  dimAmount: number         // 0.5–0.95
  showVisualizer: boolean
  visualizerStyle: VisualizerStyle
}

export type ViewerFont      = 'sans' | 'serif' | 'mono'
export type ViewerSpacing   = 'tight' | 'normal' | 'relaxed' | 'loose'
export type ViewerThemeKey  = 'auto' | 'dark' | 'warm' | 'slate'
export type ViewerBgMode    = 'solid' | 'cover' | 'ambient'
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
  bgDim:           number        // 0 – 0.95
  // Text / line effects
  inactiveOpacity: number        // 0 – 1 (when karaoke active)
  activeGlow:      boolean
  showSections:    boolean
}

/** How often the current Spotify track is asked for. */
export interface PollingSettings {
  /** Layout poll while something is playing. */
  playingMs: number
  /** Layout poll while paused or nothing is playing. */
  idleMs: number
  /** Karaoke, sync mode and timestamp editing — position is interpolated in between. */
  fastMs: number
  /** Show the poll tick strip in the now-playing widget. */
  showTick: boolean
}

export interface AppSettings {
  theme: { mode: ThemeMode }
  search: { mode: SearchMode }
  discover: { layout: LibraryLayout }
  visual: VisualSettings
  viewer: ViewerSettings
  polling: PollingSettings
}

export type SectionKey = keyof AppSettings

// ─── Defaults ─────────────────────────────────────────────────────────────────

/** Same rule as the pre-paint script in index.html: follow the OS until chosen. */
function systemTheme(): ThemeMode {
  try {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: { mode: systemTheme() },
  search: { mode: 'open' },
  discover: { layout: 'list' },
  visual: {
    enabled: false,
    pages: { dashboard: true, discover: true, favorites: true, timeline: true, settings: true, song: true },
    mode: 'both',
    blurAmount: 20,
    dimAmount: 0.75,
    showVisualizer: true,
    visualizerStyle: 'pulse',
  },
  viewer: {
    font: 'sans',
    fontSize: 1,
    fontWeight: 400,
    spacing: 'normal',
    textAlign: 'left',
    letterSpacing: 0,
    theme: 'auto',
    customBg: '',
    customText: '',
    bgMode: 'solid',
    bgBlur: 20,
    bgDim: 0.5,
    inactiveOpacity: 0.35,
    activeGlow: false,
    showSections: true,
  },
  polling: {
    playingMs: 5_000,
    idleMs: 15_000,
    fastMs: 3_000,
    showTick: false,
  },
}

/**
 * Stored settings over the defaults, section by section. A setting added later
 * simply falls back to its default — no migration. `visual.pages` is nested,
 * so it is merged one level deeper.
 */
function mergeWithDefaults(stored: unknown): AppSettings {
  const s = (isObject(stored) ? stored : {}) as Partial<Record<SectionKey, unknown>>
  const section = <K extends SectionKey>(k: K): AppSettings[K] =>
    ({ ...DEFAULT_SETTINGS[k], ...(isObject(s[k]) ? s[k] : {}) }) as AppSettings[K]

  const visual = section('visual')
  visual.pages = { ...DEFAULT_SETTINGS.visual.pages, ...(isObject(visual.pages) ? visual.pages : {}) }

  return {
    theme: section('theme'),
    search: section('search'),
    discover: section('discover'),
    visual,
    viewer: section('viewer'),
    polling: section('polling'),
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// ─── Browser cache ────────────────────────────────────────────────────────────
// The server is the source of truth. The per-user cache only makes the first
// paint right (theme, visuals) before GET /users/me/settings has answered.

const cacheKey = (userId: string) => `settings:${userId}`

function readCache(userId: string): unknown {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(userId: string, settings: AppSettings) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(settings))
    // index.html reads this before first paint to avoid a theme flash.
    localStorage.setItem('theme', settings.theme.mode)
  } catch { /* storage full or blocked — the server copy still holds */ }
}

// ─── Legacy import ────────────────────────────────────────────────────────────
// Before settings were per user they lived in loose browser keys, shared by
// everyone using this browser. The first account that loads empty server
// settings adopts them, then the keys are removed so nobody else inherits them.

const LEGACY_KEYS = ['theme', 'searchMode', 'discoverLayout', 'visual-settings', 'lyrics-viewer-settings']

function readLegacy(): Partial<AppSettings> | null {
  try {
    const found: Partial<AppSettings> = {}
    const theme = localStorage.getItem('theme')
    if (theme === 'light' || theme === 'dark') found.theme = { mode: theme }
    const search = localStorage.getItem('searchMode')
    if (search === 'open' || search === 'save') found.search = { mode: search }
    const layout = localStorage.getItem('discoverLayout')
    if (layout === 'list' || layout === 'grid') found.discover = { layout }
    const visual = localStorage.getItem('visual-settings')
    // zustand/persist wrapped its state as { state, version }
    if (visual) found.visual = (JSON.parse(visual) as { state?: VisualSettings }).state
    const viewer = localStorage.getItem('lyrics-viewer-settings')
    if (viewer) found.viewer = JSON.parse(viewer) as ViewerSettings
    // 'theme' alone doesn't count: it stays behind as the pre-paint cache and
    // then belongs to whoever used this browser last.
    return Object.keys(found).some((k) => k !== 'theme') ? found : null
  } catch {
    return null
  }
}

function clearLegacy() {
  try {
    // 'theme' stays: it doubles as the pre-paint cache (see writeCache).
    LEGACY_KEYS.filter((k) => k !== 'theme').forEach((k) => localStorage.removeItem(k))
  } catch { /**/ }
}

// ─── Store ────────────────────────────────────────────────────────────────────

/** Sections changed locally and not yet sent to the server. */
let pending: Partial<AppSettings> = {}
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_DELAY_MS = 500

interface SettingsState extends AppSettings {
  userId: string | null
  /** True once the server copy has been applied for `userId`. */
  synced: boolean
  /** Load settings for a freshly logged-in (or restored) user. */
  load(userId: string): Promise<void>
  /** Merge `patch` into one section; saved to the server shortly after. */
  update<K extends SectionKey>(key: K, patch: Partial<AppSettings[K]>): void
  /** Put one section back to its defaults. */
  resetSection(key: SectionKey): void
  /** Logout: back to defaults, nothing kept for the next person. */
  clear(): void
}

export const useSettingsStore = create<SettingsState>()((set, get) => {
  function flush() {
    flushTimer = null
    const body = pending
    pending = {}
    if (Object.keys(body).length === 0 || !get().userId) return
    api.patch('/users/me/settings', body).catch((err) => {
      logError('Einstellungen speichern', err)
      // Keep what failed so the next change retries it.
      pending = { ...body, ...pending }
    })
  }

  function persist(key: SectionKey, value: AppSettings[SectionKey]) {
    const { userId } = get()
    if (!userId) return
    pending = { ...pending, [key]: value }
    writeCache(userId, pick(get()))
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS)
  }

  return {
    ...DEFAULT_SETTINGS,
    userId: null,
    synced: false,

    async load(userId) {
      // Instant: last known settings for this user from this browser.
      set({ ...mergeWithDefaults(readCache(userId)), userId, synced: false })

      try {
        const { data: server } = await api.get<Record<string, unknown>>('/users/me/settings')
        if (get().userId !== userId) return // logged out meanwhile

        let merged = mergeWithDefaults(server)
        if (Object.keys(server).length === 0) {
          const legacy = readLegacy()
          if (legacy) {
            merged = mergeWithDefaults(legacy)
            await api.patch('/users/me/settings', merged)
            clearLegacy()
          }
        }
        // Local edits made while the GET was in flight win.
        set({ ...merged, ...pending, synced: true })
        writeCache(userId, pick(get()))
      } catch (err) {
        logError('Einstellungen laden', err)
      }
    },

    update(key, patch) {
      const next = { ...get()[key], ...patch } as AppSettings[typeof key]
      set({ [key]: next } as Partial<SettingsState>)
      persist(key, next)
    },

    resetSection(key) {
      const next = DEFAULT_SETTINGS[key]
      set({ [key]: next } as Partial<SettingsState>)
      persist(key, next)
    },

    clear() {
      // The token is already gone at this point, so a last flush would 401 and
      // trip the "session expired" handler. At most 500ms of changes are lost.
      if (flushTimer) clearTimeout(flushTimer)
      flushTimer = null
      pending = {}
      set({ ...DEFAULT_SETTINGS, userId: null, synced: false })
    },
  }
})

function pick(s: AppSettings): AppSettings {
  return {
    theme: s.theme,
    search: s.search,
    discover: s.discover,
    visual: s.visual,
    viewer: s.viewer,
    polling: s.polling,
  }
}
