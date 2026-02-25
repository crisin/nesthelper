import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X, ExternalLink, BookmarkPlus } from 'lucide-react'
import api from '../services/api'
import type { SavedLyric, SearchHistoryItem } from '../types'
import SwipeToDelete from './SwipeToDelete'
import BottomSheet from './BottomSheet'

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

type SearchMode = 'open' | 'save'

export default function LyricsSearch() {
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [mode, setMode] = useState<SearchMode>(
    () => (localStorage.getItem('searchMode') as SearchMode) ?? 'open',
  )
  const queryClient = useQueryClient()

  function toggleMode(next: SearchMode) {
    setMode(next)
    localStorage.setItem('searchMode', next)
  }

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
      if (!track) { setError('Derzeit wird nichts abgespielt'); return }

      const artist = track.artists.map((a) => a.name).join(', ')
      const url = `https://www.google.com/search?q=${encodeURIComponent(`${artist} ${track.name} lyrics`)}`

      if (mode === 'open') window.open(url, '_blank', 'noopener,noreferrer')
      saveEntry.mutate({ spotifyId: track.id, track: track.name, artist, url, imgUrl: track.album.images[0]?.url })
    } catch {
      setError('Aktueller Track kann nicht abgerufen werden. Ist Spotify verbunden?')
    }
  }

  function toggleFavorite(item: SearchHistoryItem) {
    const savedId = savedByHistoryId.get(item.id)
    if (savedId) unsaveFavorite.mutate(savedId)
    else saveFavorite.mutate(item)
  }

  return (
    <div className="space-y-5">
      {/* Search button + mode toggle + error */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm
                       hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            <Search size={14} strokeWidth={2.25} />
            Lyrics suchen
          </button>

          {/* Mode toggle */}
          <div className="flex items-center rounded-lg border border-edge bg-surface-raised p-0.5 gap-0.5">
            <button
              onClick={() => toggleMode('open')}
              title="Direkt mit Google suchen"
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                mode === 'open'
                  ? 'bg-surface-overlay text-foreground'
                  : 'text-foreground-subtle hover:text-foreground-muted',
              ].join(' ')}
            >
              <ExternalLink size={11} strokeWidth={2} />
              Google Suche
            </button>
            <button
              onClick={() => toggleMode('save')}
              title="Nur speichern"
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                mode === 'save'
                  ? 'bg-surface-overlay text-foreground'
                  : 'text-foreground-subtle hover:text-foreground-muted',
              ].join(' ')}
            >
              <BookmarkPlus size={11} strokeWidth={2} />
              Speichern
            </button>
          </div>
        </div>

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
            Suchverlauf
          </p>
          <ul className="space-y-1.5">
            {history.map((item) => {
              const isSaved = savedByHistoryId.has(item.id)
              return (
                <li key={item.id} className="min-w-0">
                  <SwipeToDelete
                    onDelete={() => setPendingDeleteId(item.id)}
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
                        onClick={() => setPendingDeleteId(item.id)}
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

      {/* Confirm delete history entry */}
      <BottomSheet open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)}>
        {(() => {
          const item = history.find((h) => h.id === pendingDeleteId)
          return (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Aus dem Verlauf löschen</h3>
                <p className="text-sm text-foreground-muted mt-1">
                  Möchtest du <strong>{item?.track}</strong> aus deinem Suchverlauf entfernen?
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    if (pendingDeleteId) removeHistory.mutate(pendingDeleteId)
                    setPendingDeleteId(null)
                  }}
                  disabled={removeHistory.isPending}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold
                             disabled:opacity-50 hover:bg-red-600 transition-colors"
                >
                  Löschen
                </button>
                <button
                  onClick={() => setPendingDeleteId(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-overlay text-foreground text-sm font-medium
                             hover:bg-surface-overlay/80 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )
        })()}
      </BottomSheet>
    </div>
  )
}
