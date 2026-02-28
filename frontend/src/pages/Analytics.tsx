import { useQuery } from '@tanstack/react-query'
import { BarChart2, Music, Tag, User, Calendar } from 'lucide-react'
import api from '../services/api'
import type { WordFrequency, TagCount, ArtistCount, WeekCount } from '../types'

// ─── Horizontal bar chart ────────────────────────────────────────────────────

function BarList<T extends { count: number }>({
  items,
  labelKey,
  maxCount,
  accent = false,
}: {
  items: T[]
  labelKey: keyof T
  maxCount: number
  accent?: boolean
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0
        const label = String(item[labelKey])
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 sm:w-36 text-[12px] text-foreground-muted truncate flex-shrink-0 text-right">
              {label}
            </span>
            <div className="flex-1 h-5 bg-surface rounded-full overflow-hidden">
              <div
                className={[
                  'h-full rounded-full transition-all duration-500',
                  accent ? 'bg-accent' : 'bg-foreground-subtle/40',
                ].join(' ')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-[11px] text-foreground-subtle text-right flex-shrink-0">
              {item.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tag cloud (sized by frequency) ─────────────────────────────────────────

function TagCloud({ tags }: { tags: TagCount[] }) {
  if (tags.length === 0) return <EmptyState message="Noch keine Tags" />
  const max = tags[0]?.count ?? 1
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        const scale = 0.75 + (count / max) * 0.5
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-raised border border-edge
                       text-foreground-muted transition-colors hover:border-foreground-muted/40"
            style={{ fontSize: `${Math.round(scale * 12)}px` }}
          >
            {tag}
            <span className="ml-1.5 text-[10px] text-foreground-subtle">{count}</span>
          </span>
        )
      })}
    </div>
  )
}

// ─── Contribution-graph week grid ─────────────────────────────────────────────

function WeekGrid({ weeks }: { weeks: WeekCount[] }) {
  const max = Math.max(...weeks.map((w) => w.count), 1)

  function intensity(count: number): string {
    if (count === 0) return 'bg-surface-raised'
    const ratio = count / max
    if (ratio < 0.25) return 'bg-accent/20'
    if (ratio < 0.5) return 'bg-accent/40'
    if (ratio < 0.75) return 'bg-accent/65'
    return 'bg-accent'
  }

  // Group by rows of 13 (approx quarter) for desktop; just flow on mobile
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {weeks.map(({ week, count }) => (
          <div
            key={week}
            title={`${week}: ${count} ${count === 1 ? 'song' : 'songs'}`}
            className={['w-3.5 h-3.5 rounded-sm transition-colors', intensity(count)].join(' ')}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-foreground-subtle">Weniger</span>
        {['bg-surface-raised', 'bg-accent/20', 'bg-accent/40', 'bg-accent/65', 'bg-accent'].map(
          (cls) => (
            <div key={cls} className={`w-3 h-3 rounded-sm ${cls}`} />
          ),
        )}
        <span className="text-[10px] text-foreground-subtle">Mehr</span>
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  isLoading,
  children,
}: {
  icon: React.ElementType
  title: string
  isLoading?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-surface-raised border border-edge p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-foreground-subtle" strokeWidth={1.75} />
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
          {title}
        </p>
      </div>
      {isLoading ? <SkeletonRows /> : children}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[80, 60, 70, 45, 55].map((w, i) => (
        <div
          key={i}
          className="h-4 rounded-full bg-surface-overlay animate-pulse"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-foreground-subtle py-2">{message}</p>
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { data: words = [], isLoading: loadingWords } = useQuery<WordFrequency[]>({
    queryKey: ['analytics-words'],
    queryFn: () => api.get<WordFrequency[]>('/analytics/me/words').then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: emotions = [], isLoading: loadingEmotions } = useQuery<TagCount[]>({
    queryKey: ['analytics-emotions'],
    queryFn: () => api.get<TagCount[]>('/analytics/me/emotions').then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: artists = [], isLoading: loadingArtists } = useQuery<ArtistCount[]>({
    queryKey: ['analytics-artists'],
    queryFn: () => api.get<ArtistCount[]>('/analytics/me/artists').then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: themes = [], isLoading: loadingThemes } = useQuery<TagCount[]>({
    queryKey: ['analytics-themes'],
    queryFn: () => api.get<TagCount[]>('/analytics/me/themes').then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: timeline = [], isLoading: loadingTimeline } = useQuery<WeekCount[]>({
    queryKey: ['analytics-timeline'],
    queryFn: () => api.get<WeekCount[]>('/analytics/me/timeline').then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const topWords = words.slice(0, 20)
  const topArtists = artists.slice(0, 15)
  const maxWords = topWords[0]?.count ?? 1
  const maxArtists = topArtists[0]?.count ?? 1
  const totalSaves = timeline.reduce((s, w) => s + w.count, 0)

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
          Persönlich
        </p>
        <h1 className="text-xl font-semibold text-foreground flex items-baseline gap-2">
          Analytics
          {totalSaves > 0 && (
            <span className="text-sm font-normal text-foreground-muted">
              {totalSaves} {totalSaves === 1 ? 'Song' : 'Songs'} in den letzten 52 Wochen
            </span>
          )}
        </h1>
      </div>

      {/* Saves over time */}
      <Section icon={Calendar} title="Gespeicherte Songs" isLoading={loadingTimeline}>
        {timeline.length === 0 ? (
          <EmptyState message="Noch keine Daten" />
        ) : (
          <WeekGrid weeks={timeline} />
        )}
      </Section>

      {/* Two-column grid for words + artists */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Section icon={Music} title="Häufigste Wörter" isLoading={loadingWords}>
          {topWords.length === 0 ? (
            <EmptyState message="Noch keine Lyrics gespeichert" />
          ) : (
            <BarList items={topWords} labelKey="word" maxCount={maxWords} accent />
          )}
        </Section>

        <Section icon={User} title="Top Artists" isLoading={loadingArtists}>
          {topArtists.length === 0 ? (
            <EmptyState message="Noch keine Songs gespeichert" />
          ) : (
            <BarList items={topArtists} labelKey="artist" maxCount={maxArtists} />
          )}
        </Section>
      </div>

      {/* Two-column grid for moods + themes */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Section icon={Tag} title="Stimmungen" isLoading={loadingEmotions}>
          {emotions.length === 0 ? (
            <EmptyState message="Noch keine Mood-Tags" />
          ) : (
            <TagCloud tags={emotions} />
          )}
        </Section>

        <Section icon={BarChart2} title="Themen" isLoading={loadingThemes}>
          {themes.length === 0 ? (
            <EmptyState message="Noch keine Context-Tags" />
          ) : (
            <TagCloud tags={themes} />
          )}
        </Section>
      </div>
    </div>
  )
}
