import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Music, ExternalLink } from 'lucide-react'
import api from '../services/api'
import type { CommunityLyric, LibraryTrack, SavedLyric } from '../types'
import PullToRefresh from '../components/PullToRefresh'

// ── Types ──────────────────────────────────────────────────────────────────

interface GlobalFeedItem {
  id: string
  track: string
  artist: string
  url: string
  imgUrl?: string
  createdAt: string
  user: { name: string | null }
}

interface LibraryLyricsResponse {
  track: LibraryTrack
  lyrics: CommunityLyric[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Single community lyric entry ───────────────────────────────────────────

function LyricEntry({ lyric }: { lyric: CommunityLyric }) {
  const [expanded, setExpanded] = useState(false)
  const lines = lyric.lyrics.split('\n')
  const isLong = lines.length > 6 || lyric.lyrics.length > 300

  return (
    <li className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">
          {lyric.user.name ?? 'Anonymous'}
        </span>
        <span className="text-[11px] text-foreground-subtle tabular-nums">
          {timeAgo(lyric.createdAt)}
        </span>
      </div>
      <div className="relative">
        <p
          className={[
            'text-xs text-foreground-muted whitespace-pre-line leading-relaxed',
            !expanded && isLong ? 'line-clamp-5' : '',
          ].join(' ')}
        >
          {lyric.lyrics}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-[11px] text-foreground-subtle hover:text-accent transition-colors"
          >
            {expanded ? 'Show less' : 'Show full lyrics'}
          </button>
        )}
      </div>
    </li>
  )
}

// ── Library track card with expandable community lyrics ────────────────────

function LibraryCard({
  track,
  isSaved,
  onSave,
  isSaving,
}: {
  track: LibraryTrack
  isSaved: boolean
  onSave: () => void
  isSaving: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading: lyricsLoading } = useQuery<LibraryLyricsResponse>({
    queryKey: ['library-lyrics', track.id],
    queryFn: () =>
      api.get<LibraryLyricsResponse>(`/library/${track.id}/lyrics`).then((r) => r.data),
    enabled: expanded,
  })

  const lyrics = data?.lyrics ?? []

  return (
    <li className="rounded-xl bg-surface-raised border border-edge overflow-hidden shadow-card">
      {/* Track row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {track.imgUrl ? (
          <img
            src={track.imgUrl}
            alt={track.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.open(track.url, '_blank', 'noopener,noreferrer')}
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-surface-overlay flex-shrink-0 flex items-center justify-center">
            <Music size={15} className="text-foreground-subtle" strokeWidth={1.75} />
          </div>
        )}

        <button
          className="flex-1 text-left min-w-0"
          onClick={() => setExpanded((v) => !v)}
        >
          <p className="font-medium text-foreground text-sm truncate">{track.name}</p>
          <p className="text-xs text-foreground-muted truncate">{track.artist}</p>
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {track.lyricsCount > 0 && (
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent tabular-nums">
              {track.lyricsCount} {track.lyricsCount === 1 ? 'lyric' : 'lyrics'}
            </span>
          )}

          <button
            onClick={onSave}
            disabled={isSaved || isSaving}
            aria-label={isSaved ? 'Already saved' : 'Save to my songs'}
            className={[
              'w-9 h-9 flex items-center justify-center text-lg leading-none transition-all disabled:opacity-30',
              isSaved ? 'text-accent' : 'text-foreground-subtle hover:text-accent',
            ].join(' ')}
          >
            {isSaved ? '♥' : '♡'}
          </button>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-foreground-subtle hover:text-foreground transition-colors p-1"
            aria-label={expanded ? 'Collapse' : 'Show community lyrics'}
          >
            <ChevronDown
              size={15}
              strokeWidth={1.75}
              style={{
                transform: expanded ? 'rotate(180deg)' : undefined,
                transition: 'transform 0.15s',
              }}
            />
          </button>
        </div>
      </div>

      {/* Community lyrics panel */}
      {expanded && (
        <div className="border-t border-edge">
          {lyricsLoading ? (
            <div className="px-4 py-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-3 rounded-full bg-surface-overlay animate-pulse ${i === 3 ? 'w-1/2' : 'w-3/4'}`}
                />
              ))}
            </div>
          ) : lyrics.length === 0 ? (
            <div className="px-4 py-4 flex items-center justify-between gap-4">
              <p className="text-xs text-foreground-subtle">
                No lyrics yet — save this song and add some.
              </p>
              <a
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-foreground-subtle hover:text-accent transition-colors flex-shrink-0"
              >
                Search online
                <ExternalLink size={11} strokeWidth={1.75} />
              </a>
            </div>
          ) : (
            <ul className="divide-y divide-edge">
              {lyrics.map((l) => (
                <LyricEntry key={l.id} lyric={l} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

// ── Main Discover page ─────────────────────────────────────────────────────

type Tab = 'library' | 'activity'

export default function Discover() {
  const [tab, setTab] = useState<Tab>('library')
  const queryClient = useQueryClient()

  const { data: library = [], isLoading: libraryLoading } = useQuery<LibraryTrack[]>({
    queryKey: ['library'],
    queryFn: () => api.get<LibraryTrack[]>('/library').then((r) => r.data),
  })

  const { data: feed = [], isLoading: feedLoading } = useQuery<GlobalFeedItem[]>({
    queryKey: ['global-feed'],
    queryFn: () => api.get<GlobalFeedItem[]>('/search-history/global').then((r) => r.data),
    enabled: tab === 'activity',
  })

  const { data: savedLyrics = [] } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const savedSet = new Set(savedLyrics.map((s) => `${s.track}|||${s.artist}`))
  const savedByHistoryId = new Map(
    savedLyrics.filter((s) => s.searchHistoryId).map((s) => [s.searchHistoryId!, s.id]),
  )

  const saveSong = useMutation({
    mutationFn: (track: LibraryTrack) =>
      api.post('/saved-lyrics', { track: track.name, artist: track.artist }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  const saveFeedItem = useMutation({
    mutationFn: (item: GlobalFeedItem) =>
      api.post('/saved-lyrics', { track: item.track, artist: item.artist, searchHistoryId: item.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })
  const unsaveFeedItem = useMutation({
    mutationFn: (savedId: string) => api.delete(`/saved-lyrics/${savedId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  const handleRefresh = useCallback(() => {
    if (tab === 'library') {
      queryClient.invalidateQueries({ queryKey: ['library'] })
    } else {
      queryClient.invalidateQueries({ queryKey: ['global-feed'] })
    }
  }, [queryClient, tab])

  const isLoading = tab === 'library' ? libraryLoading : feedLoading

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto space-y-5 overflow-hidden">

        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
            Community
          </p>
          <h1 className="text-xl font-semibold text-foreground">Discover</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-lg bg-surface-raised border border-edge w-fit">
          {(['library', 'activity'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                tab === t
                  ? 'bg-surface-overlay text-foreground shadow-sm'
                  : 'text-foreground-muted hover:text-foreground',
              ].join(' ')}
            >
              {t === 'library' ? 'Song Library' : 'Activity'}
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <ul className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-[60px] rounded-xl bg-surface-raised border border-edge animate-pulse" />
            ))}
          </ul>
        )}

        {/* ── Song Library tab ──────────────────────────────────── */}
        {!isLoading && tab === 'library' && (
          library.length === 0 ? (
            <p className="text-sm text-foreground-subtle py-4">
              No songs yet — search lyrics on the Home page to populate the library.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {library.map((track) => (
                <LibraryCard
                  key={track.id}
                  track={track}
                  isSaved={savedSet.has(`${track.name}|||${track.artist}`)}
                  onSave={() => saveSong.mutate(track)}
                  isSaving={saveSong.isPending}
                />
              ))}
            </ul>
          )
        )}

        {/* ── Activity tab ──────────────────────────────────────── */}
        {!isLoading && tab === 'activity' && (
          feed.length === 0 ? (
            <p className="text-sm text-foreground-subtle py-4">
              No searches yet — be the first!
            </p>
          ) : (
            <ul className="space-y-1.5">
              {feed.map((item) => {
                const isSaved = savedByHistoryId.has(item.id)
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                               bg-surface-raised border border-edge hover:border-foreground-muted/40
                               transition-colors group shadow-card"
                  >
                    {item.imgUrl ? (
                      <img
                        src={item.imgUrl}
                        alt={item.track}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-surface-overlay flex-shrink-0" />
                    )}

                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                    >
                      <p className="font-medium text-foreground text-sm truncate">{item.track}</p>
                      <p className="text-xs text-foreground-muted truncate">{item.artist}</p>
                    </button>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:flex flex-col items-end gap-0.5">
                        <span className="text-xs text-foreground-muted">{item.user.name ?? 'Anonymous'}</span>
                        <span className="text-[11px] text-foreground-subtle tabular-nums">{timeAgo(item.createdAt)}</span>
                      </div>
                      <span className="sm:hidden text-[11px] text-foreground-subtle tabular-nums">
                        {timeAgo(item.createdAt)}
                      </span>
                      <button
                        onClick={() => {
                          const savedId = savedByHistoryId.get(item.id)
                          if (savedId) unsaveFeedItem.mutate(savedId)
                          else saveFeedItem.mutate(item)
                        }}
                        disabled={saveFeedItem.isPending || unsaveFeedItem.isPending}
                        aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}
                        className={[
                          'w-9 h-9 sm:w-auto sm:h-auto flex items-center justify-center text-lg leading-none transition-all disabled:opacity-30',
                          isSaved
                            ? 'text-accent'
                            : 'text-foreground-subtle hover:text-accent sm:opacity-0 sm:group-hover:opacity-100',
                        ].join(' ')}
                      >
                        {isSaved ? '♥' : '♡'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        )}
      </div>
    </PullToRefresh>
  )
}
