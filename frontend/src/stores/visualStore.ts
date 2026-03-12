import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type VisualMode = 'blur' | 'ambient' | 'both'
export type VisualizerStyle = 'pulse' | 'breathe'

interface VisualStore {
  enabled: boolean
  pages: Record<string, boolean>
  mode: VisualMode
  blurAmount: number        // 8–40px, default 20
  dimAmount: number         // 0.5–0.95, default 0.75
  showVisualizer: boolean
  visualizerStyle: VisualizerStyle
  setEnabled: (v: boolean) => void
  setPageEnabled: (page: string, v: boolean) => void
  set: (patch: Partial<Omit<VisualStore, 'setEnabled' | 'setPageEnabled' | 'set'>>) => void
}

export const useVisualStore = create<VisualStore>()(
  persist(
    (set) => ({
      enabled: false,
      pages: { dashboard: true, discover: true, favorites: true, timeline: true },
      mode: 'both',
      blurAmount: 20,
      dimAmount: 0.75,
      showVisualizer: true,
      visualizerStyle: 'pulse',
      setEnabled: (v) => set({ enabled: v }),
      setPageEnabled: (page, v) => set((s) => ({ pages: { ...s.pages, [page]: v } })),
      set: (patch) => set(patch),
    }),
    { name: 'visual-settings' },
  ),
)
