import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { SavedLyric } from '../types'

interface GlobalFeedItem {
  id: string
  track: string
  artist: string
  url: string
  imgUrl?: string
  createdAt: string
  user: { name: string | null }
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

export default function Discover() {
  const queryClient = useQueryClient()

  const { data: feed = [], isLoading } = useQuery<GlobalFeedItem[]>({
    queryKey: ['global-feed'],
    queryFn: () => api.get<GlobalFeedItem[]>('/search-history/global').then((r) => r.data),
  })

  const { data: savedLyrics = [] } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const savedByHistoryId = new Map(
    savedLyrics.filter((s) => s.searchHistoryId).map((s) => [s.searchHistoryId!, s.id]),
  )

  const saveFavorite = useMutation({
    mutationFn: (item: GlobalFeedItem) =>
      api.post('/saved-lyrics', { track: item.track, artist: item.artist, searchHistoryId: item.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  const unsaveFavorite = useMutation({
    mutationFn: (savedId: string) => api.delete(`/saved-lyrics/${savedId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  function toggleFavorite(item: GlobalFeedItem) {
    const savedId = savedByHistoryId.get(item.id)
    if (savedId) unsaveFavorite.mutate(savedId)
    else saveFavorite.mutate(item)
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">Global feed</p>
        <h2 className="text-base font-semibold text-foreground">Discover</h2>
        <p className="text-sm text-foreground-muted mt-1">
          What everyone's been listening to — save anything to your favorites.
        </p>
      </div>

      {isLoading && (
        <ul className="space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-[60px] rounded-xl bg-surface-raised border border-edge animate-pulse" />
          ))}
        </ul>
      )}

      {!isLoading && feed.length === 0 && (
        <p className="text-sm text-foreground-subtle py-4">No searches yet — be the first!</p>
      )}

      {!isLoading && feed.length > 0 && (
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
                    onClick={() => toggleFavorite(item)}
                    disabled={saveFavorite.isPending || unsaveFavorite.isPending}
                    aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}
                    className={`text-lg leading-none transition-all disabled:opacity-30
                      ${isSaved
                        ? 'text-accent'
                        : 'text-foreground-subtle hover:text-accent opacity-0 group-hover:opacity-100'}`}
                  >
                    {isSaved ? '♥' : '♡'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
