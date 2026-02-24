import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import api from '../services/api'
import type { SavedLyric, SearchHistoryItem } from '../types'
import SwipeToDelete from './SwipeToDelete'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { images: { url: string }[] }
}

interface CurrentTrackResponse {
  item: SpotifyTrack | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function LyricsSearch() {
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: history = [] } = useQuery<SearchHistoryItem[]>({
    queryKey: ['search-history'],
    queryFn: () => api.get<SearchHistoryItem[]>('/search-history').then((r) => r.data),
  })

  const { data: savedLyrics = [] } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const savedByHistoryId = new Map(
    savedLyrics
      .filter((s) => s.searchHistoryId)
      .map((s) => [s.searchHistoryId!, s.id]),
  )

  const saveEntry = useMutation({
    mutationFn: (entry: Omit<SearchHistoryItem, 'id' | 'createdAt'>) =>
      api.post<SearchHistoryItem>('/search-history', entry).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-history'] }),
  })

  const saveFavorite = useMutation({
    mutationFn: (item: SearchHistoryItem) =>
      api.post('/saved-lyrics', { track: item.track, artist: item.artist, searchHistoryId: item.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  const unsaveFavorite = useMutation({
    mutationFn: (savedId: string) => api.delete(`/saved-lyrics/${savedId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  const removeHistory = useMutation({
    mutationFn: (id: string) => api.delete(`/search-history/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-history'] }),
  })

  async function handleSearch() {
    setError(null)
    try {
      const res = await api.get<CurrentTrackResponse>('/spotify/current-track')
      const track = res.data?.item
      if (!track) { setError('Nothing is playing right now.'); return }

      const artist = track.artists.map((a) => a.name).join(', ')
      const url = `https://www.google.com/search?q=${encodeURIComponent(`${artist} ${track.name} lyrics`)}`

      window.open(url, '_blank', 'noopener,noreferrer')
      saveEntry.mutate({ spotifyId: track.id, track: track.name, artist, url, imgUrl: track.album.images[0]?.url })
    } catch {
      setError('Could not fetch current track. Is Spotify connected?')
    }
  }

  function toggleFavorite(item: SearchHistoryItem) {
    const savedId = savedByHistoryId.get(item.id)
    if (savedId) unsaveFavorite.mutate(savedId)
    else saveFavorite.mutate(item)
  }

  return (
    <div className="space-y-5">
      {/* Search button + error */}
      <div className="space-y-2.5">
        <button
          onClick={handleSearch}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm
                     hover:opacity-90 transition-opacity active:scale-[0.98]"
        >
          <Search size={14} strokeWidth={2.25} />
          Search Lyrics
        </button>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20
                          text-sm text-red-600 dark:text-red-400 animate-fade-in">
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* History list */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
            Search History
          </p>
          <ul className="space-y-1.5">
            {history.map((item) => {
              const isSaved = savedByHistoryId.has(item.id)
              return (
                <li key={item.id}>
                  <SwipeToDelete
                    onDelete={() => removeHistory.mutate(item.id)}
                    disabled={removeHistory.isPending}
                  >
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-raised border border-edge
                                 hover:border-foreground-muted/40 transition-colors group shadow-card"
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

                      <span className="text-[11px] text-foreground-subtle flex-shrink-0 tabular-nums">
                        {timeAgo(item.createdAt)}
                      </span>

                      {/* Heart */}
                      <button
                        onClick={() => toggleFavorite(item)}
                        disabled={saveFavorite.isPending || unsaveFavorite.isPending}
                        aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}
                        className={[
                          'flex-shrink-0 w-9 h-9 sm:w-auto sm:h-auto flex items-center justify-center text-lg leading-none disabled:opacity-30 transition-all',
                          isSaved
                            ? 'text-accent'
                            : 'text-foreground-subtle hover:text-accent sm:opacity-0 sm:group-hover:opacity-100'
                        ].join(' ')}
                      >
                        {isSaved ? '♥' : '♡'}
                      </button>

                      {/* Remove (desktop only — mobile uses swipe) */}
                      <button
                        onClick={() => removeHistory.mutate(item.id)}
                        disabled={removeHistory.isPending}
                        aria-label="Remove from history"
                        className="hidden sm:flex flex-shrink-0 items-center justify-center text-foreground-subtle disabled:opacity-30 hover:text-foreground
                                   transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </SwipeToDelete>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
