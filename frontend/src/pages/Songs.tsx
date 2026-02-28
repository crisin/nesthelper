import { useState, useMemo, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, X, ChevronRight, ExternalLink } from 'lucide-react'
import api from '../services/api'
import type { SavedLyric } from '../types'
import SwipeToDelete from '../components/SwipeToDelete'
import PullToRefresh from '../components/PullToRefresh'
import TrackListItem from '../components/TrackListItem'
import DigestBanner from '../components/DigestBanner'

type SortKey = 'recent' | 'artist' | 'title'

function formatAdded(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'artist', label: 'Artist' },
  { key: 'title',  label: 'Title' },
]

export default function Songs() {
  const [query, setQuery]   = useState('')
  const [sort, setSort]     = useState<SortKey>('recent')
  const navigate            = useNavigate()
  const queryClient         = useQueryClient()

  const { data: songs = [], isLoading } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const removeSong = useMutation({
    mutationFn: (id: string) => api.delete(`/saved-lyrics/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? songs.filter(
          (s) =>
            s.track.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            s.lyrics?.toLowerCase().includes(q) ||
            s.tags?.some((t) => t.tag.includes(q)),
        )
      : [...songs]

    if (sort === 'artist') list.sort((a, b) => a.artist.localeCompare(b.artist))
    else if (sort === 'title') list.sort((a, b) => a.track.localeCompare(b.track))
    // 'recent' keeps API order (createdAt desc)

    return list
  }, [songs, query, sort])

  const handleRefresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
    [queryClient],
  )

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-3">
        <div className="h-4 w-32 rounded-full bg-surface-raised animate-pulse mb-5" />
        <div className="h-9 w-full rounded-lg bg-surface-raised animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-raised border border-edge animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-4 overflow-hidden">

        {/* Weekly digest */}
        <DigestBanner />

        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
            Library
          </p>
          <h1 className="text-xl font-semibold text-foreground flex items-baseline gap-2">
            Saved Songs
            {songs.length > 0 && (
              <span className="text-sm font-normal text-foreground-muted">{songs.length}</span>
            )}
          </h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none"
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="Track, Artist, Lyrics oder Tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-surface-raised border border-edge rounded-lg text-sm
                       placeholder:text-foreground-subtle focus:outline-none focus:border-foreground-muted/60
                       transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground transition-colors"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Sort controls */}
        {songs.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-foreground-subtle font-medium mr-0.5">Sort:</span>
            {SORTS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={[
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  sort === key
                    ? 'bg-surface-overlay text-foreground'
                    : 'text-foreground-muted hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {songs.length === 0 ? (
          <p className="text-sm text-foreground-subtle py-4">
            No saved songs yet — hit ♡ on a history item.
          </p>
        ) : displayed.length === 0 ? (
          <p className="text-sm text-foreground-subtle py-4">
            No songs match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <ul className="space-y-2">
            {displayed.map((song) => {
              const spotifyId = song.searchHistory?.spotifyId
              const imgUrl    = song.searchHistory?.imgUrl

              return (
                <li key={song.id} className="min-w-0">
                  <SwipeToDelete
                    onDelete={() => removeSong.mutate(song.id)}
                    disabled={removeSong.isPending}
                  >
                    <TrackListItem
                      src={imgUrl}
                      track={song.track}
                      artist={song.artists?.join(", ") || song.artist}
                      size="md"
                      onCardClick={() => navigate(`/songs/${song.id}`)}
                      meta={
                        <div className="flex items-center gap-2 pt-0.5">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                              song.lyrics
                                ? 'bg-accent/10 text-accent'
                                : 'bg-surface-overlay text-foreground-subtle'
                            }`}
                          >
                            {song.lyrics ? 'lyrics' : 'empty'}
                          </span>
                          <span className="text-[11px] text-foreground-subtle">
                            {formatAdded(song.createdAt)}
                          </span>
                        </div>
                      }
                      actions={
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {spotifyId && (
                            <span
                              role="img"
                              aria-label="Open on Spotify"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(
                                  `https://open.spotify.com/track/${spotifyId}`,
                                  '_blank',
                                  'noopener,noreferrer',
                                )
                              }}
                              className="w-8 h-8 flex items-center justify-center text-foreground-subtle hover:text-accent transition-colors cursor-pointer"
                            >
                              <ExternalLink size={13} strokeWidth={1.75} />
                            </span>
                          )}
                          <ChevronRight
                            size={15}
                            className="text-foreground-subtle group-hover:text-foreground-muted transition-colors"
                            strokeWidth={1.75}
                          />
                        </div>
                      }
                    />
                  </SwipeToDelete>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </PullToRefresh>
  )
}
