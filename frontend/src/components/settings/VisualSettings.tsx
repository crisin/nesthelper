import { useVisualStore, type VisualMode, type VisualizerStyle } from '../../stores/visualStore'
import { FieldLabel, Segmented, SettingRow, Toggle } from './controls'

const PAGES = [
  ['dashboard', 'Dashboard'],
  ['discover', 'Entdecken'],
  ['favorites', 'Favoriten'],
  ['timeline', 'Timeline'],
  ['settings', 'Einstellungen'],
  ['song', 'Song-Detail'],
] as const

const MODES = [
  ['blur', 'Unschärfe'],
  ['ambient', 'Farbe'],
  ['both', 'Beides'],
] as const satisfies readonly (readonly [VisualMode, string])[]

const VISUALIZER_STYLES = [
  ['pulse', 'Puls'],
  ['breathe', 'Atmen'],
] as const satisfies readonly (readonly [VisualizerStyle, string])[]

/** Einstellungen → Visuelles (dynamic background). */
export default function VisualSettings() {
  const visual = useVisualStore()

  return (
    <section className="pt-6 border-t border-edge space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Visuelles</h2>

      <SettingRow
        title="Dynamischer Hintergrund"
        description="Albumcover als Hintergrund während Musikwiedergabe"
      >
        <Toggle checked={visual.enabled} onChange={visual.setEnabled} />
      </SettingRow>

      {visual.enabled && (
        <div className="space-y-4 pl-3 border-l-2 border-edge">
          <div className="space-y-2.5">
            <FieldLabel>Seiten</FieldLabel>
            {PAGES.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-foreground-muted">{label}</span>
                <Toggle
                  size="sm"
                  label={label}
                  checked={!!visual.pages[key]}
                  onChange={(v) => visual.setPageEnabled(key, v)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Modus</FieldLabel>
            <Segmented<VisualMode>
              value={visual.mode}
              options={MODES}
              onChange={(mode) => visual.set({ mode })}
            />
          </div>

          {(visual.mode === 'blur' || visual.mode === 'both') && (
            <div className="space-y-1.5">
              <FieldLabel value={`${visual.blurAmount}px`}>Unschärfe</FieldLabel>
              <input
                type="range"
                min={8}
                max={40}
                value={visual.blurAmount}
                onChange={(e) => visual.set({ blurAmount: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <FieldLabel value={`${Math.round(visual.dimAmount * 100)}%`}>Abdunklung</FieldLabel>
            <input
              type="range"
              min={50}
              max={95}
              value={Math.round(visual.dimAmount * 100)}
              onChange={(e) => visual.set({ dimAmount: Number(e.target.value) / 100 })}
              className="w-full accent-accent"
            />
          </div>

          {/* Visualizer (desktop only) */}
          <div className="hidden sm:block space-y-3">
            <SettingRow title="Visualizer" description="BPM-synchronisierte Animation">
              <Toggle
                checked={visual.showVisualizer}
                onChange={(v) => visual.set({ showVisualizer: v })}
              />
            </SettingRow>
            {visual.showVisualizer && (
              <Segmented<VisualizerStyle>
                value={visual.visualizerStyle}
                options={VISUALIZER_STYLES}
                onChange={(visualizerStyle) => visual.set({ visualizerStyle })}
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}
