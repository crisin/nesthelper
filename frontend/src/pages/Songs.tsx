import { useState, useMemo, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Music, Search, X, ChevronRight } from 'lucide-react'
import api from '../services/api'
import type { SavedLyric } from '../types'
import SwipeToDelete from '../components/SwipeToDelete'
import PullToRefresh from '../components/PullToRefresh'

export default function Songs() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: songs = [], isLoading } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const removeSong = useMutation({
    mutationFn: (id: string) => api.delete(`/saved-lyrics/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return songs
    return songs.filter(
      (s) =>
        s.track.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q),
    )
  }, [songs, query])

  const handleRefresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
    [queryClient],
  )

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto space-y-3">
        <div className="h-4 w-32 rounded-full bg-surface-raised animate-pulse mb-5" />
        <div className="h-9 w-full rounded-lg bg-surface-raised animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-surface-raised border border-edge animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto space-y-5 overflow-hidden">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
          Library
        </p>
        <h1 className="text-xl font-semibold text-foreground flex items-baseline gap-2">
          Saved Songs
          {songs.length > 0 && (
            <span className="text-sm font-normal text-foreground-muted">
              {songs.length}
            </span>
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
          placeholder="Search by track or artist…"
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

      {/* List */}
      {songs.length === 0 ? (
        <p className="text-sm text-foreground-subtle py-4">
          No saved songs yet — hit ♡ on a history item.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-foreground-subtle py-4">
          No songs match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((song) => (
            <li key={song.id} className="min-w-0">
              <SwipeToDelete
                onDelete={() => removeSong.mutate(song.id)}
                disabled={removeSong.isPending}
              >
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-raised border border-edge
                             hover:bg-surface-overlay transition-colors text-left group"
                  onClick={() => navigate(`/songs/${song.id}`)}
                >
                  {song.searchHistory?.imgUrl ? (
                    <img
                      src={song.searchHistory.imgUrl}
                      alt={song.track}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-overlay flex-shrink-0 flex items-center justify-center">
                      <Music size={15} className="text-foreground-subtle" strokeWidth={1.75} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{song.track}</p>
                    <p className="text-xs text-foreground-muted truncate">{song.artist}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                        song.lyrics
                          ? 'bg-accent/10 text-accent'
                          : 'bg-surface-overlay text-foreground-subtle'
                      }`}
                    >
                      {song.lyrics ? 'lyrics' : 'empty'}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-foreground-subtle group-hover:text-foreground-muted transition-colors"
                      strokeWidth={1.75}
                    />
                  </div>
                </button>
              </SwipeToDelete>
            </li>
          ))}
        </ul>
      )}
    </div>
    </PullToRefresh>
  )
}
