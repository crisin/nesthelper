import { useEffect, useReducer } from 'react'
import { usePollLog, type PollEntry } from '../hooks/useNowPlaying'
import { useSettingsStore } from '../stores/settingsStore'

const WINDOW_MS = 60_000

function tone(status: number): string {
  if (status >= 200 && status < 300) return 'bg-accent'
  if (status === 429 || (status >= 400 && status < 500)) return 'bg-amber-400'
  return 'bg-red-500' // 5xx or no response
}

function statusLabel(e: PollEntry): string {
  return e.status === 0 ? 'keine Antwort' : `HTTP ${e.status}`
}

/**
 * Debug view of the current-track polling: every request of the last minute
 * as a tick on a timeline (right = now), coloured by outcome, plus age of the
 * last answer, requests per minute and average round trip.
 *
 * `compact` is the one-line version for the mobile bar.
 */
export default function PollTick({ compact = false }: { compact?: boolean }) {
  const log = usePollLog()
  const polling = useSettingsStore((s) => s.polling)

  // Re-render a few times per second so ages and tick positions move.
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [])

  // eslint-disable-next-line react-hooks/purity -- the display is a clock
  const now = Date.now()
  const recent = log.filter((e) => now - e.at <= WINDOW_MS)
  const last = recent.at(-1)
  const age = last ? (now - last.at) / 1000 : null
  const fresh = age !== null && age < 0.6
  const avgMs = recent.length
    ? Math.round(recent.reduce((sum, e) => sum + e.ms, 0) / recent.length)
    : null
  const errors = recent.filter((e) => e.status < 200 || e.status >= 300).length

  const dot = (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform duration-300 ${
        last ? tone(last.status) : 'bg-surface-overlay'
      } ${fresh ? 'scale-150' : 'scale-100 opacity-60'}`}
    />
  )

  const summary = [
    age === null ? 'noch kein Poll' : `vor ${age.toFixed(1)}s`,
    `${recent.length}/min`,
    avgMs !== null ? `Ø ${avgMs}ms` : null,
    errors ? `${errors} Fehler` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  if (compact) {
    return (
      <span className="flex items-center gap-1 text-[9px] tabular-nums text-foreground-subtle">
        {dot}
        {recent.length}/min
      </span>
    )
  }

  return (
    <div
      className="space-y-1"
      title={last ? `Letzter Poll: ${statusLabel(last)} in ${last.ms}ms` : undefined}
    >
      <div className="flex items-center gap-1.5 text-[9px] tabular-nums text-foreground-subtle">
        {dot}
        <span className="truncate">{summary}</span>
        <span className="ml-auto flex-shrink-0">
          {polling.playingMs / 1000}s / {polling.idleMs / 1000}s
        </span>
      </div>
      {/* Timeline of the last minute; right edge is now */}
      <div className="relative h-2.5 rounded-sm bg-surface-overlay/60 overflow-hidden">
        {recent.map((e) => (
          <span
            key={e.at}
            title={`${statusLabel(e)} · ${e.ms}ms · vor ${((now - e.at) / 1000).toFixed(0)}s`}
            className={`absolute top-0 bottom-0 w-px ${tone(e.status)}`}
            style={{ left: `${(1 - (now - e.at) / WINDOW_MS) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}
