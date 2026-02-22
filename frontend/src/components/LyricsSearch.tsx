import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { SavedLyric, SearchHistoryItem } from '../types'

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
    <div className="space-y-6">
      {/* Search button + error */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-spotify-green text-black font-semibold text-sm hover:bg-spotify-green/90 transition-colors active:scale-[0.98]"
        >
          Search Lyrics
        </button>
        {error && (
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-500 text-left"
          >
            {error} ✕
          </button>
        )}
      </div>

      {/* History list */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-app-faint uppercase tracking-widest">
            Search History
          </p>
          <ul className="space-y-1">
            {history.map((item) => {
              const isSaved = savedByHistoryId.has(item.id)
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-app-card border border-app-edge hover:border-app-muted/40 transition-colors group"
                >
                  {item.imgUrl ? (
                    <img
                      src={item.imgUrl}
                      alt={item.track}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-app-input flex-shrink-0" />
                  )}

                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                  >
                    <p className="font-medium text-app-ink text-sm truncate">{item.track}</p>
                    <p className="text-xs text-app-muted truncate">{item.artist}</p>
                  </button>

                  <span className="text-xs text-app-faint flex-shrink-0 tabular-nums">
                    {timeAgo(item.createdAt)}
                  </span>

                  {/* Heart */}
                  <button
                    onClick={() => toggleFavorite(item)}
                    disabled={saveFavorite.isPending || unsaveFavorite.isPending}
                    aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}
                    className={[
                      'flex-shrink-0 text-lg leading-none disabled:opacity-30 transition-all',
                      isSaved
                        ? 'text-spotify-green'
                        : 'text-app-faint hover:text-spotify-green opacity-0 group-hover:opacity-100'
                    ].join(' ')}
                  >
                    {isSaved ? '♥' : '♡'}
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeHistory.mutate(item.id)}
                    disabled={removeHistory.isPending}
                    aria-label="Remove from history"
                    className="flex-shrink-0 text-lg leading-none text-app-faint disabled:opacity-30"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
