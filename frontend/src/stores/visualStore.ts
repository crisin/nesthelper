import {
  useSettingsStore,
  type VisualSettings,
} from './settingsStore'

export type { VisualMode, VisualizerStyle } from './settingsStore'

export interface VisualStore extends VisualSettings {
  setEnabled: (v: boolean) => void
  setPageEnabled: (page: string, v: boolean) => void
  set: (patch: Partial<VisualSettings>) => void
}

/**
 * The dynamic-background settings. Kept as its own hook for the call sites;
 * the data is the `visual` section of the per-user settings store.
 */
export function useVisualStore(): VisualStore
export function useVisualStore<T>(selector: (s: VisualStore) => T): T
export function useVisualStore<T>(selector?: (s: VisualStore) => T): T | VisualStore {
  const visual = useSettingsStore((s) => s.visual)
  const update = useSettingsStore((s) => s.update)
  const store: VisualStore = {
    ...visual,
    setEnabled: (v) => update('visual', { enabled: v }),
    setPageEnabled: (page, v) => update('visual', { pages: { ...visual.pages, [page]: v } }),
    set: (patch) => update('visual', patch),
  }
  return selector ? selector(store) : store
}
