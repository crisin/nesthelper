import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import TrackListItem from '../components/TrackListItem'
import type { TimelineMonth } from '../types'

// ─── Mood → emoji map (best-effort on free-text tags) ─────────────────────────

const MOOD_EMOJI: [string, string][] = [
  ['happy', '😊'],
  ['sad', '😢'],
  ['melanchol', '😌'],
  ['angry', '😠'],
  ['rage', '😠'],
  ['energet', '⚡'],
  ['hype', '⚡'],
  ['chill', '😎'],
  ['relax', '😎'],
  ['romantic', '❤️'],
  ['love', '❤️'],
  ['nostalgic', '🕰️'],
  ['nostalgi', '🕰️'],
  ['hopeful', '✨'],
  ['hope', '✨'],
  ['dark', '🌑'],
  ['anxious', '😰'],
  ['anxiety', '😰'],
  ['calm', '🌿'],
  ['peaceful', '🌿'],
  ['fun', '🎉'],
  ['party', '🎉'],
]

function moodEmoji(mood: string | null): string {
  if (!mood) return ''
  const lower = mood.toLowerCase()
  for (const [key, emoji] of MOOD_EMOJI) {
    if (lower.includes(key)) return emoji
  }
  return '🎵'
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-10">
      {[3, 2, 4].map((n, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-28 rounded-full bg-surface-raised animate-pulse" />
          {Array.from({ length: n }).map((_, j) => (
            <div key={j} className="h-14 rounded-xl bg-surface-raised border border-edge animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Timeline() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const { data: months = [], isLoading } = useQuery<TimelineMonth[]>({
    queryKey: ['timeline-monthly', year],
    queryFn: () =>
      api.get<TimelineMonth[]>(`/analytics/me/monthly?year=${year}`).then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)

  return (
    <div className="px-4 sm:px-8 py-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
            Persönlich
          </p>
          <h1 className="text-xl font-semibold text-foreground">Memory Timeline</h1>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-1 flex-shrink-0 pt-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                y === year
                  ? 'bg-surface-overlay text-foreground'
                  : 'text-foreground-muted hover:text-foreground',
              ].join(' ')}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Skeleton />
      ) : months.length === 0 ? (
        <p className="text-sm text-foreground-subtle py-4">
          Keine Songs in {year} gespeichert.
        </p>
      ) : (
        <div className="space-y-10">
          {months.map(({ month, dominantMood, songs }) => (
            <section key={month}>
              {/* Month header */}
              <div className="flex items-center gap-2 mb-3">
                {dominantMood && (
                  <span className="text-base leading-none" aria-hidden>
                    {moodEmoji(dominantMood)}
                  </span>
                )}
                <h2 className="text-base font-semibold text-foreground">{month}</h2>
                {dominantMood && (
                  <span className="text-[11px] text-foreground-muted px-2 py-0.5 rounded-full bg-surface-raised border border-edge">
                    {dominantMood}
                  </span>
                )}
                <span className="text-[11px] text-foreground-subtle ml-auto">
                  {songs.length} {songs.length === 1 ? 'Song' : 'Songs'}
                </span>
              </div>

              {/* Song list */}
              <ul className="space-y-2">
                {songs.map((song) => (
                  <li key={song.id}>
                    <TrackListItem
                      src={song.searchHistory?.imgUrl}
                      track={song.track}
                      artist={song.artist}
                      size="sm"
                      onCardClick={() => navigate(`/songs/${song.id}`)}
                      actions={
                        <ChevronRight
                          size={14}
                          className="text-foreground-subtle flex-shrink-0"
                          strokeWidth={1.75}
                        />
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
