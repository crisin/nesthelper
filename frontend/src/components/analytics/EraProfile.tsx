import { useState } from 'react'
import type { EraProfile as Era } from '../../types'

const formatDuration = (ms: number) => {
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// ─── Release years ───────────────────────────────────────────────────────────

function YearSkyline({ years }: { years: { year: number; count: number }[] }) {
  const max = Math.max(...years.map((y) => y.count), 1)
  const first = years[0].year
  const last = years[years.length - 1].year
  // Fill the gaps so an empty decade reads as empty rather than being skipped.
  const span = Array.from({ length: last - first + 1 }, (_, i) => {
    const year = first + i
    return { year, count: years.find((y) => y.year === year)?.count ?? 0 }
  })

  return (
    <div>
      <div className="flex items-end gap-[2px] h-32">
        {span.map(({ year, count }) => (
          <div
            key={year}
            title={`${year}: ${count} ${count === 1 ? 'Song' : 'Songs'}`}
            className="flex-1 min-w-[2px] rounded-t-sm bg-accent transition-all duration-500"
            style={{
              height: `${Math.max(count > 0 ? 4 : 1, (count / max) * 100)}%`,
              opacity: count > 0 ? 1 : 0.15,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-foreground-subtle tabular-nums">{first}</span>
        <span className="text-[10px] text-foreground-subtle tabular-nums">{last}</span>
      </div>
    </div>
  )
}

// ─── Duration against how densely a song is sung ─────────────────────────────

function DensityScatter({ songs }: { songs: Era['density'] }) {
  const [active, setActive] = useState<string | null>(null)

  const W = 320
  const H = 200
  const PAD = 28

  const maxDuration = Math.max(...songs.map((s) => s.durationMs))
  const maxWpm = Math.max(...songs.map((s) => s.wordsPerMinute), 1)

  const x = (ms: number) => PAD + (ms / maxDuration) * (W - PAD - 8)
  const y = (wpm: number) => H - PAD - (wpm / maxWpm) * (H - PAD - 8)

  const selected = songs.find((s) => s.spotifyId === active)

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Laufzeit gegen Wörter pro Minute für ${songs.length} Songs`}
      >
        {/* Axes — recessive */}
        <line x1={PAD} y1={H - PAD} x2={W - 4} y2={H - PAD} stroke="currentColor" className="text-edge" strokeWidth={1} />
        <line x1={PAD} y1={4} x2={PAD} y2={H - PAD} stroke="currentColor" className="text-edge" strokeWidth={1} />

        <text x={W - 4} y={H - PAD + 12} textAnchor="end" fontSize={9} className="fill-foreground-subtle">
          Länge →
        </text>
        <text x={2} y={12} fontSize={9} className="fill-foreground-subtle">
          Wörter/Min ↑
        </text>

        {songs.map((song) => {
          const isActive = song.spotifyId === active
          const cx = x(song.durationMs)
          const cy = y(song.wordsPerMinute)
          return (
            <g
              key={song.spotifyId}
              onClick={() => setActive(isActive ? null : song.spotifyId)}
              className="cursor-pointer"
            >
              {/* Invisible hit area — the visible dot is ~8px across, which is
                  below a usable tap target on a phone. */}
              <circle cx={cx} cy={cy} r={11} fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 6 : 4.5}
                fill="var(--color-accent)"
                fillOpacity={isActive ? 1 : 0.55}
                stroke="var(--color-surface-raised)"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            </g>
          )
        })}
      </svg>

      <p className="text-[11px] text-foreground-muted mt-1 min-h-[1.5em]">
        {selected ? (
          <>
            <span className="text-foreground font-medium">{selected.title}</span>
            {' · '}
            {selected.artist} · {formatDuration(selected.durationMs)} ·{' '}
            {selected.wordsPerMinute} Wörter/Min
          </>
        ) : (
          'Tipp auf einen Punkt für den Song.'
        )}
      </p>
    </div>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function EraProfile({ data }: { data: Era }) {
  const { coverage, years, density, explicit, albumTypes } = data

  if (coverage.enriched === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-foreground-subtle">
          Für Jahrgänge und Songlängen fehlen noch die Spotify-Metadaten.
        </p>
        <p className="text-[11px] text-foreground-subtle">
          Sie werden einmalig pro Song abgeholt — starte das in den Einstellungen
          unter „Spotify-Daten nachladen".
        </p>
      </div>
    )
  }

  const partial = coverage.enriched < coverage.total

  return (
    <div className="space-y-6">
      {partial && (
        <p className="text-[11px] text-foreground-subtle">
          Basiert auf {coverage.enriched} von {coverage.total} Songs — für den
          Rest fehlen die Spotify-Metadaten noch.
        </p>
      )}

      {years.length > 1 ? (
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-2">
            Jahrgänge
          </p>
          <YearSkyline years={years} />
        </div>
      ) : (
        <p className="text-sm text-foreground-subtle">
          Noch zu wenige Songs mit Erscheinungsdatum für eine Verteilung.
        </p>
      )}

      {density.length >= 5 && (
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
            Länge und Textdichte
          </p>
          <p className="text-[11px] text-foreground-subtle mb-2">
            Rechts unten stehen die langen, wortkargen Songs — links oben die
            kurzen Textgewitter.
          </p>
          <DensityScatter songs={density} />
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {explicit.of > 0 && (
          <div>
            <p className="text-[11px] text-foreground-subtle">Explicit</p>
            <p className="text-sm text-foreground tabular-nums">
              {Math.round((explicit.count / explicit.of) * 100)}%
              <span className="text-foreground-subtle text-[11px] ml-1">
                ({explicit.count} von {explicit.of})
              </span>
            </p>
          </div>
        )}
        {albumTypes.slice(0, 3).map((entry) => (
          <div key={entry.type}>
            <p className="text-[11px] text-foreground-subtle capitalize">{entry.type}</p>
            <p className="text-sm text-foreground tabular-nums">{entry.count}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
