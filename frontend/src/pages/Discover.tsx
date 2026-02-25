import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ExternalLink, LayoutGrid, LayoutList } from 'lucide-react'
import api from '../services/api'
import type { CommunityLyric, LibraryTrack, SavedLyric } from '../types'
import PullToRefresh from '../components/PullToRefresh'
import TrackCover from '../components/TrackCover'

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

type LibrarySortKey = 'recent' | 'artist' | 'title' | 'lyrics'
type LibraryLayout  = 'list' | 'grid'

const LIBRARY_SORTS: { key: LibrarySortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'artist', label: 'Artist' },
  { key: 'title',  label: 'Title' },
  { key: 'lyrics', label: 'Lyrics' },
]

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
  const isLong = lyric.lyrics.split('\n').length > 6 || lyric.lyrics.length > 300

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
      <div>
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

// ── Library track card — LIST layout ───────────────────────────────────────

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
      <div className="flex items-center gap-3.5 px-3 py-3">
        <TrackCover
          src={track.imgUrl}
          track={track.name}
          artist={track.artist}
          className="w-14 h-14 rounded-xl shadow-sm"
        />

        <button
          className="flex-1 text-left min-w-0"
          onClick={() => setExpanded((v) => !v)}
        >
          <p className="font-semibold text-foreground text-sm leading-tight truncate">{track.name}</p>
          <p className="text-xs text-foreground-muted truncate mt-0.5">{track.artist}</p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {track.lyricsCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent tabular-nums">
                {track.lyricsCount} {track.lyricsCount === 1 ? 'lyric' : 'lyrics'}
              </span>
            )}
            {track.searchCount > 0 && (
              <span className="text-[11px] text-foreground-subtle tabular-nums">
                {track.searchCount}× searched
              </span>
            )}
            <span className="text-[11px] text-foreground-subtle">
              {timeAgo(track.lastSeenAt)}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <a
            href={`https://open.spotify.com/track/${track.spotifyId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 flex items-center justify-center text-foreground-subtle hover:text-accent transition-colors"
            aria-label="Open on Spotify"
          >
            <ExternalLink size={13} strokeWidth={1.75} />
          </a>

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
                Noch keine Lyrics — speichere diesen Song, um Lyrics hinzuzufügen.
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

// ── Library track card — GRID layout ───────────────────────────────────────

function LibraryGridCard({
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
  return (
    <li className="rounded-xl bg-surface-raised border border-edge overflow-hidden shadow-card group">
      {/* Square cover */}
      <div className="relative aspect-square">
        <TrackCover
          src={track.imgUrl}
          track={track.name}
          artist={track.artist}
          className="w-full h-full"
          iconSize={28}
        />

        {/* Hover overlay — pointer-events-none so clicks reach TrackCover beneath */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-150 pointer-events-none" />

        {/* Heart — always visible */}
        <button
          onClick={onSave}
          disabled={isSaved || isSaving}
          aria-label={isSaved ? 'Already saved' : 'Save to my songs'}
          className={[
            'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-base leading-none',
            'bg-black/40 backdrop-blur-sm transition-all disabled:opacity-40',
            isSaved ? 'text-accent' : 'text-white hover:text-accent',
          ].join(' ')}
        >
          {isSaved ? '♥' : '♡'}
        </button>

        {/* Spotify link — appears on hover */}
        <a
          href={`https://open.spotify.com/track/${track.spotifyId}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open on Spotify"
          className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center
                     bg-black/40 backdrop-blur-sm text-white hover:text-accent transition-all
                     opacity-0 group-hover:opacity-100"
        >
          <ExternalLink size={12} strokeWidth={2} />
        </a>

        {/* Stats pill — bottom of cover */}
        {(track.lyricsCount > 0 || track.searchCount > 0) && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5
                          opacity-0 group-hover:opacity-100 transition-opacity">
            {track.lyricsCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md
                               bg-black/60 backdrop-blur-sm text-white tabular-nums">
                {track.lyricsCount} {track.lyricsCount === 1 ? 'lyric' : 'lyrics'}
              </span>
            )}
            {track.searchCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md
                               bg-black/60 backdrop-blur-sm text-white tabular-nums">
                {track.searchCount}×
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 py-2.5">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{track.name}</p>
        <p className="text-[11px] text-foreground-muted truncate mt-0.5">{track.artist}</p>
      </div>
    </li>
  )
}

// ── Artist section divider ─────────────────────────────────────────────────

function ArtistDivider({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 pt-2 first:pt-0">
      <span className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest flex-shrink-0">
        {name}
      </span>
      <div className="flex-1 h-px bg-edge" />
    </div>
  )
}

// ── Main Discover page ─────────────────────────────────────────────────────

type Tab = 'library' | 'activity'

export default function Discover() {
  const [tab, setTab]                 = useState<Tab>('library')
  const [librarySort, setLibrarySort] = useState<LibrarySortKey>('recent')
  const [layout, setLayout]           = useState<LibraryLayout>(
    () => (localStorage.getItem('discoverLayout') as LibraryLayout) ?? 'list',
  )
  const queryClient = useQueryClient()

  function toggleLayout(next: LibraryLayout) {
    setLayout(next)
    localStorage.setItem('discoverLayout', next)
  }

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

  const sortedLibrary = useMemo(() => {
    const list = [...library]
    if (librarySort === 'artist') list.sort((a, b) => a.artist.localeCompare(b.artist))
    else if (librarySort === 'title') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (librarySort === 'lyrics') list.sort((a, b) => b.lyricsCount - a.lyricsCount)
    return list
  }, [library, librarySort])

  // Group by artist when artist sort is active
  const artistGroups = useMemo(() => {
    if (librarySort !== 'artist') return null
    const groups: { artist: string; tracks: LibraryTrack[] }[] = []
    for (const track of sortedLibrary) {
      const last = groups[groups.length - 1]
      if (!last || last.artist !== track.artist) {
        groups.push({ artist: track.artist, tracks: [track] })
      } else {
        last.tracks.push(track)
      }
    }
    return groups
  }, [sortedLibrary, librarySort])

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
    return Promise.resolve()
  }, [queryClient, tab])

  const isLoading = tab === 'library' ? libraryLoading : feedLoading

  // Shared card props builder
  function cardProps(track: LibraryTrack) {
    return {
      track,
      isSaved: savedSet.has(`${track.name}|||${track.artist}`),
      onSave: () => saveSong.mutate(track),
      isSaving: saveSong.isPending,
    }
  }

  // Render a flat or grouped list for the library tab
  function renderLibraryTracks(tracks: LibraryTrack[]) {
    if (layout === 'grid') {
      return (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {tracks.map((t) => <LibraryGridCard key={t.id} {...cardProps(t)} />)}
        </ul>
      )
    }
    return (
      <ul className="space-y-2">
        {tracks.map((t) => <LibraryCard key={t.id} {...cardProps(t)} />)}
      </ul>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-4 overflow-hidden">

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

        {/* Library controls: sort + layout toggle */}
        {tab === 'library' && library.length > 1 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-[11px] text-foreground-subtle font-medium mr-0.5">Sort:</span>
              {LIBRARY_SORTS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setLibrarySort(key)}
                  className={[
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    librarySort === key
                      ? 'bg-surface-overlay text-foreground'
                      : 'text-foreground-muted hover:text-foreground',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Layout toggle */}
            <div className="flex items-center rounded-lg border border-edge bg-surface-raised p-0.5 gap-0.5 flex-shrink-0">
              <button
                onClick={() => toggleLayout('list')}
                title="List view"
                className={[
                  'p-1.5 rounded-md transition-colors',
                  layout === 'list'
                    ? 'bg-surface-overlay text-foreground'
                    : 'text-foreground-subtle hover:text-foreground-muted',
                ].join(' ')}
              >
                <LayoutList size={13} strokeWidth={2} />
              </button>
              <button
                onClick={() => toggleLayout('grid')}
                title="Grid view"
                className={[
                  'p-1.5 rounded-md transition-colors',
                  layout === 'grid'
                    ? 'bg-surface-overlay text-foreground'
                    : 'text-foreground-subtle hover:text-foreground-muted',
                ].join(' ')}
              >
                <LayoutGrid size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          layout === 'grid' && tab === 'library' ? (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="rounded-xl bg-surface-raised border border-edge animate-pulse">
                  <div className="aspect-square" />
                  <div className="px-2.5 py-2.5 space-y-1.5">
                    <div className="h-2.5 w-3/4 rounded-full bg-surface-overlay" />
                    <div className="h-2 w-1/2 rounded-full bg-surface-overlay" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="h-20 rounded-xl bg-surface-raised border border-edge animate-pulse" />
              ))}
            </ul>
          )
        )}

        {/* ── Song Library tab ──────────────────────────────────── */}
        {!isLoading && tab === 'library' && (
          library.length === 0 ? (
            <p className="text-sm text-foreground-subtle py-4">
              No songs yet — search lyrics on the Home page to populate the library.
            </p>
          ) : artistGroups ? (
            // Grouped by artist
            <div className="space-y-4">
              {artistGroups.map(({ artist, tracks }) => (
                <div key={artist} className="space-y-2">
                  <ArtistDivider name={artist} />
                  {renderLibraryTracks(tracks)}
                </div>
              ))}
            </div>
          ) : (
            renderLibraryTracks(sortedLibrary)
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
                    <TrackCover
                      src={item.imgUrl}
                      track={item.track}
                      artist={item.artist}
                      className="w-9 h-9 rounded-lg"
                      iconSize={14}
                    />

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
