import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookmarkPlus, Check, ExternalLink, FileText, LayoutGrid, LayoutList, RefreshCw, Search, X } from 'lucide-react'
import api from '../services/api'
import type { PlayHistoryEntry, SavedLyric, Song } from '../types'
import DynamicBackground from '../components/DynamicBackground'
import PullToRefresh from '../components/PullToRefresh'
import TrackCover from '../components/TrackCover'
import TrackListItem from '../components/TrackListItem'

// ── Types ──────────────────────────────────────────────────────────────────

interface GlobalFeedItem {
  id: string
  spotifyId: string
  track: string
  artist: string
  artists: string[]
  url: string
  imgUrl?: string
  createdAt: string
  user: { name: string | null }
}

type LibrarySortKey = 'recent' | 'artist' | 'title'
type LibraryLayout  = 'list' | 'grid'

const LIBRARY_SORTS: { key: LibrarySortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'artist', label: 'Artist' },
  { key: 'title',  label: 'Title' },
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

// ── Song card — LIST layout ─────────────────────────────────────────────────

function SongCard({
  song,
  isSaved,
  onSave,
  isSaving,
  onNavigate,
  id,
  highlight = false,
}: {
  song: Song
  isSaved: boolean
  onSave: () => void
  isSaving: boolean
  onNavigate: () => void
  id?: string
  highlight?: boolean
}) {
  return (
    <li id={id}>
      <TrackListItem
        src={song.imgUrl}
        track={song.title}
        artist={song.artists?.join(", ") || song.artist}
        size="md"
        className={highlight ? 'ring-2 ring-accent/50' : ''}
        meta={
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {song.hasLyrics && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
                lyrics
              </span>
            )}
            {song.saveCount != null && song.saveCount > 0 && (
              <span className="text-[11px] text-foreground-subtle tabular-nums">
                {song.saveCount}× saved
              </span>
            )}
            <span className="text-[11px] text-foreground-subtle">
              {timeAgo(song.updatedAt)}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <a
              href={`https://open.spotify.com/track/${song.spotifyId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center text-foreground-subtle hover:text-accent transition-colors"
              aria-label="Open on Spotify"
            >
              <ExternalLink size={13} strokeWidth={1.75} />
            </a>
            <button
              onClick={onNavigate}
              aria-label="Lyrics bearbeiten"
              className="w-8 h-8 flex items-center justify-center text-foreground-subtle hover:text-foreground transition-colors"
            >
              <FileText size={13} strokeWidth={1.75} />
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}
              className={[
                'w-9 h-9 flex items-center justify-center text-lg leading-none transition-all disabled:opacity-30',
                isSaved ? 'text-accent' : 'text-foreground-subtle hover:text-accent',
              ].join(' ')}
            >
              {isSaved ? '♥' : '♡'}
            </button>
          </div>
        }
      />
    </li>
  )
}

// ── Song card — GRID layout ─────────────────────────────────────────────────

function SongGridCard({
  song,
  isSaved,
  onSave,
  isSaving,
  onNavigate,
}: {
  song: Song
  isSaved: boolean
  onSave: () => void
  isSaving: boolean
  onNavigate: () => void
}) {
  return (
    <li className="rounded-xl bg-surface-raised border border-edge overflow-hidden shadow-card group">
      {/* Square cover */}
      <div className="relative aspect-square">
        <TrackCover
          src={song.imgUrl}
          track={song.title}
          artist={song.artists?.join(", ") || song.artist}
          className="w-full h-full"
          iconSize={28}
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-150 pointer-events-none" />

        {/* Heart */}
        <button
          onClick={onSave}
          disabled={isSaving}
          aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}
          className={[
            'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-base leading-none',
            'bg-black/40 backdrop-blur-sm transition-all disabled:opacity-40',
            isSaved ? 'text-accent' : 'text-white hover:text-accent',
          ].join(' ')}
        >
          {isSaved ? '♥' : '♡'}
        </button>

        {/* Spotify link */}
        <a
          href={`https://open.spotify.com/track/${song.spotifyId}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open on Spotify"
          className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center
                     bg-black/40 backdrop-blur-sm text-white hover:text-accent transition-all
                     opacity-0 group-hover:opacity-100"
        >
          <ExternalLink size={12} strokeWidth={2} />
        </a>

        {/* Lyrics badge */}
        {song.hasLyrics && (
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md
                             bg-black/60 backdrop-blur-sm text-white">
              lyrics
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center">
        <div className="flex-1 min-w-0 px-2.5 py-2.5">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">{song.title}</p>
          <p className="text-[11px] text-foreground-muted truncate mt-0.5">{song.artists?.join(", ") || song.artist}</p>
        </div>
        <button
          onClick={onNavigate}
          aria-label="Lyrics bearbeiten"
          className="flex-shrink-0 w-8 h-8 mr-1 flex items-center justify-center text-foreground-subtle hover:text-foreground transition-colors"
        >
          <FileText size={13} strokeWidth={1.75} />
        </button>
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

// ── History row ────────────────────────────────────────────────────────────

function timeAgoShort(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function HistoryRow({
  entry,
  onImported,
}: {
  entry: PlayHistoryEntry
  onImported: () => void
}) {
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  const importMutation = useMutation({
    mutationFn: () =>
      api.post<{ imported: boolean }>(`/spotify/plays/${entry.spotifyId}/import`).then((r) => r.data),
    onSuccess: (data) => {
      setDone(true)
      if (data.imported) onImported()
    },
  })

  return (
    <li className="group">
      <TrackListItem
        src={entry.imgUrl ?? undefined}
        track={entry.track}
        artist={entry.artists.join(', ') || entry.artist}
        size="md"
        interactive
        onContentClick={() => navigate(`/songs/${entry.spotifyId}`)}
        actions={
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-foreground-subtle tabular-nums hidden sm:block">
              {timeAgoShort(entry.playedAt)}
            </span>
            <button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending || done}
              title={done ? 'Gespeichert' : 'Als Song speichern'}
              className={[
                'w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all',
                done
                  ? 'text-accent'
                  : 'text-foreground-subtle hover:text-accent sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40',
              ].join(' ')}
            >
              {done
                ? <Check size={13} strokeWidth={2} />
                : <BookmarkPlus size={13} strokeWidth={1.75} />
              }
            </button>
          </div>
        }
      />
    </li>
  )
}

// ── Main Discover page ─────────────────────────────────────────────────────

type Tab = 'library' | 'activity' | 'history'

export default function Discover() {
  const location = useLocation()
  const navigate  = useNavigate()

  const [tab, setTab]                 = useState<Tab>('library')
  const [librarySort, setLibrarySort] = useState<LibrarySortKey>('recent')
  const [layout, setLayout]           = useState<LibraryLayout>(
    () => (localStorage.getItem('discoverLayout') as LibraryLayout) ?? 'list',
  )
  const [highlightSpotifyId, setHighlightSpotifyId] = useState<string | null>(
    () => (location.state as { highlightSpotifyId?: string } | null)?.highlightSpotifyId ?? null,
  )
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!highlightSpotifyId) return
    navigate('.', { replace: true, state: null })
    const scrollTimer = setTimeout(() => {
      document.getElementById(`track-${highlightSpotifyId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    const clearTimer = setTimeout(() => setHighlightSpotifyId(null), 2000)
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer) }
  }, [highlightSpotifyId, navigate])

  function toggleLayout(next: LibraryLayout) {
    setLayout(next)
    localStorage.setItem('discoverLayout', next)
  }

  const { data: songs = [], isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ['songs'],
    queryFn: () => api.get<Song[]>('/songs').then((r) => r.data),
  })

  const { data: feed = [], isLoading: feedLoading } = useQuery<GlobalFeedItem[]>({
    queryKey: ['global-feed'],
    queryFn: () => api.get<GlobalFeedItem[]>('/search-history/global').then((r) => r.data),
    enabled: tab === 'activity',
  })

  const syncHistory = useMutation({
    mutationFn: () => api.post<{ synced: number }>('/spotify/sync-history').then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['play-history'] }),
  })

  const { data: favorites = [] } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics-favorites'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics/favorites').then((r) => r.data),
  })

  const favoritedSpotifyIds = new Set(
    favorites.map((s) => s.song?.spotifyId).filter(Boolean) as string[],
  )

  const [libraryQuery, setLibraryQuery] = useState('')

  const { data: history = [], isLoading: historyLoading } = useQuery<PlayHistoryEntry[]>({
    queryKey: ['play-history'],
    queryFn: () => api.get<PlayHistoryEntry[]>('/spotify/plays?limit=200').then((r) => r.data),
    enabled: tab === 'history' || (tab === 'library' && libraryQuery.trim().length > 0),
    staleTime: 30_000,
  })

  const sortedSongs = useMemo(() => {
    const list = [...songs]
    if (librarySort === 'artist') list.sort((a, b) => a.artist.localeCompare(b.artist))
    else if (librarySort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [songs, librarySort])

  const filteredSongs = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase()
    if (!q) return sortedSongs
    return sortedSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.artists.some((a) => a.toLowerCase().includes(q)),
    )
  }, [sortedSongs, libraryQuery])

  // History entries that match the search query but aren't already saved songs
  const savedSpotifyIds = useMemo(() => new Set(songs.map((s) => s.spotifyId)), [songs])

  const filteredHistory = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase()
    if (!q) return []
    // Deduplicate by spotifyId — only keep most recent play per track
    const seen = new Set<string>()
    return history.filter((e) => {
      if (savedSpotifyIds.has(e.spotifyId)) return false
      if (seen.has(e.spotifyId)) return false
      const matches =
        e.track.toLowerCase().includes(q) ||
        e.artist.toLowerCase().includes(q) ||
        e.artists.some((a) => a.toLowerCase().includes(q))
      if (matches) seen.add(e.spotifyId)
      return matches
    })
  }, [history, libraryQuery, savedSpotifyIds])

  const artistGroups = useMemo(() => {
    if (librarySort !== 'artist' || libraryQuery.trim()) return null
    const groups: { artist: string; songs: Song[] }[] = []
    for (const song of sortedSongs) {
      const last = groups[groups.length - 1]
      if (!last || last.artist !== song.artist) {
        groups.push({ artist: song.artist, songs: [song] })
      } else {
        last.songs.push(song)
      }
    }
    return groups
  }, [sortedSongs, librarySort, libraryQuery])

  const toggleFavorite = useMutation({
    mutationFn: (spotifyId: string) =>
      favoritedSpotifyIds.has(spotifyId)
        ? api.delete(`/saved-lyrics/favorite/${spotifyId}`)
        : api.post(`/saved-lyrics/favorite/${spotifyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics-favorites'] }),
  })

  const handleRefresh = useCallback(() => {
    if (tab === 'library') queryClient.invalidateQueries({ queryKey: ['songs'] })
    else if (tab === 'activity') queryClient.invalidateQueries({ queryKey: ['global-feed'] })
    else queryClient.invalidateQueries({ queryKey: ['play-history'] })
    return Promise.resolve()
  }, [queryClient, tab])

  const isLoading = tab === 'library' ? songsLoading : tab === 'activity' ? feedLoading : historyLoading

  function cardProps(song: Song) {
    return {
      song,
      isSaved: favoritedSpotifyIds.has(song.spotifyId),
      onSave: () => toggleFavorite.mutate(song.spotifyId),
      isSaving: toggleFavorite.isPending,
      onNavigate: () => navigate(`/songs/${song.spotifyId}`),
    }
  }

  function renderLibrarySongs(list: Song[]) {
    if (layout === 'grid') {
      return (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {list.map((s) => <SongGridCard key={s.id} {...cardProps(s)} />)}
        </ul>
      )
    }
    return (
      <ul className="space-y-2">
        {list.map((s) => (
          <SongCard
            key={s.id}
            id={`track-${s.spotifyId}`}
            highlight={highlightSpotifyId === s.spotifyId}
            {...cardProps(s)}
          />
        ))}
      </ul>
    )
  }

  return (
    <>
    <DynamicBackground page="discover" />
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
          {(['library', 'activity', 'history'] as Tab[]).map((t) => (
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
              {t === 'library' ? 'Song Library' : t === 'activity' ? 'Activity' : 'Verlauf'}
            </button>
          ))}
        </div>

        {/* Library search */}
        {tab === 'library' && (
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none"
            />
            <input
              type="text"
              placeholder="Bibliothek durchsuchen…"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-raised border border-edge text-sm
                         placeholder:text-foreground-subtle/60 focus:outline-none focus:border-foreground-muted/50 transition-colors"
            />
            {libraryQuery && (
              <button
                onClick={() => setLibraryQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground transition-colors"
              >
                <X size={13} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}

        {/* Library controls: sort + layout toggle */}
        {tab === 'library' && songs.length > 1 && (
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
          songs.length === 0 ? (
            <p className="text-sm text-foreground-subtle py-4">
              No songs yet — search lyrics on the Home page to populate the library.
            </p>
          ) : filteredSongs.length === 0 ? (
            <p className="text-sm text-foreground-subtle py-4">
              Keine Treffer für &ldquo;{libraryQuery}&rdquo;.
            </p>
          ) : artistGroups ? (
            <div className="space-y-4">
              {artistGroups.map(({ artist, songs: group }) => (
                <div key={artist} className="space-y-2">
                  <ArtistDivider name={artist} />
                  {renderLibrarySongs(group)}
                </div>
              ))}
            </div>
          ) : (
            renderLibrarySongs(filteredSongs)
          )
        )}

        {/* ── Library tab: history hits not yet saved ───────────── */}
        {tab === 'library' && filteredHistory.length > 0 && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest whitespace-nowrap">
                Aus Verlauf
              </p>
              <div className="flex-1 h-px bg-edge" />
            </div>
            <ul className="space-y-0.5">
              {filteredHistory.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  onImported={() => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })}
                />
              ))}
            </ul>
          </div>
        )}

        {/* ── History tab ───────────────────────────────────────── */}
        {!isLoading && tab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-foreground-subtle">{history.length} Songs aufgezeichnet</p>
              <button
                onClick={() => syncHistory.mutate()}
                disabled={syncHistory.isPending}
                className="flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-accent transition-colors disabled:opacity-40"
              >
                <RefreshCw size={11} strokeWidth={1.75} className={syncHistory.isPending ? 'animate-spin' : ''} />
                Von Spotify synchronisieren
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-foreground-subtle py-4">
                Noch keine Songs aufgezeichnet. Spiele etwas ab und öffne Lyrics Helper!
              </p>
            ) : (
              <ul className="space-y-0.5">
                {history.map((entry) => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    onImported={() => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })}
                  />
                ))}
              </ul>
            )}
          </div>
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
                const isSaved = favoritedSpotifyIds.has(item.spotifyId)
                return (
                  <li key={item.id}>
                    <TrackListItem
                      src={item.imgUrl}
                      track={item.track}
                      artist={item.artists?.join(", ") || item.artist}
                      size="md"
                      interactive
                      onContentClick={() => {
                        const match = songs.find(
                          (s) => s.spotifyId === item.spotifyId,
                        )
                        setTab('library')
                        if (match) setHighlightSpotifyId(match.spotifyId)
                      }}
                      actions={
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="hidden sm:flex flex-col items-end gap-0.5">
                            <span className="text-xs text-foreground-muted">{item.user.name ?? 'Anonymous'}</span>
                            <span className="text-[11px] text-foreground-subtle tabular-nums">{timeAgo(item.createdAt)}</span>
                          </div>
                          <span className="sm:hidden text-[11px] text-foreground-subtle tabular-nums">
                            {timeAgo(item.createdAt)}
                          </span>
                          <button
                            onClick={() => toggleFavorite.mutate(item.spotifyId)}
                            disabled={toggleFavorite.isPending}
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
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )
        )}
      </div>
    </PullToRefresh>
    </>
  )
}
