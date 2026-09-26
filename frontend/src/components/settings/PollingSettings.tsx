import { RotateCcw } from 'lucide-react'
import PollTick from '../PollTick'
import { useSettingsStore } from '../../stores/settingsStore'
import { FieldLabel, Segmented, SettingRow, Toggle } from './controls'

const PLAYING_OPTIONS = [
  [2_000, '2s'],
  [3_000, '3s'],
  [5_000, '5s'],
  [10_000, '10s'],
  [15_000, '15s'],
  [30_000, '30s'],
] as const

const IDLE_OPTIONS = [
  [5_000, '5s'],
  [10_000, '10s'],
  [15_000, '15s'],
  [30_000, '30s'],
  [60_000, '60s'],
] as const

const FAST_OPTIONS = [
  [1_000, '1s'],
  [2_000, '2s'],
  [3_000, '3s'],
  [5_000, '5s'],
] as const

/** Einstellungen → Spotify-Polling. */
export default function PollingSettings() {
  const polling = useSettingsStore((s) => s.polling)
  const update = useSettingsStore((s) => s.update)
  const resetSection = useSettingsStore((s) => s.resetSection)

  return (
    <section className="pt-6 border-t border-edge space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Spotify-Polling</h2>
          <p className="text-xs text-foreground-muted mt-0.5">
            Wie oft der aktuelle Track abgefragt wird. Kürzer = schnellere Reaktion, mehr Requests
            ans Backend und an Spotify.
          </p>
        </div>
        <button
          onClick={() => resetSection('polling')}
          className="flex items-center gap-1 text-xs text-foreground-subtle hover:text-foreground transition-colors flex-shrink-0"
        >
          <RotateCcw size={11} strokeWidth={2} />
          Standard
        </button>
      </div>

      <div className="space-y-1.5">
        <FieldLabel value={`${Math.round(60_000 / polling.playingMs)} Requests/min`}>
          Während Wiedergabe
        </FieldLabel>
        <Segmented
          value={polling.playingMs}
          options={PLAYING_OPTIONS}
          onChange={(v) => update('polling', { playingMs: v })}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel value={`${Math.round(60_000 / polling.idleMs)} Requests/min`}>
          Pausiert / nichts läuft
        </FieldLabel>
        <Segmented
          value={polling.idleMs}
          options={IDLE_OPTIONS}
          onChange={(v) => update('polling', { idleMs: v })}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel value="Position dazwischen wird hochgerechnet">
          Karaoke / Sync / Timestamps
        </FieldLabel>
        <Segmented
          value={polling.fastMs}
          options={FAST_OPTIONS}
          onChange={(v) => update('polling', { fastMs: v })}
        />
      </div>

      <SettingRow
        title="Poll-Ticks anzeigen"
        description="Zeitleiste der letzten Minute unter dem Now-Playing-Widget: ein Strich pro Request, grün = ok, gelb = 4xx/429, rot = Fehler."
      >
        <Toggle
          checked={polling.showTick}
          onChange={(v) => update('polling', { showTick: v })}
        />
      </SettingRow>

      {/* Live preview — same component as in the sidebar */}
      <div className="rounded-lg border border-edge bg-surface-raised px-3 py-2.5">
        <PollTick />
      </div>
    </section>
  )
}
