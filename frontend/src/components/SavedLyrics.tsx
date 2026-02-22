import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { SavedLyric } from '../types'

interface LyricsCardProps {
  item: SavedLyric
  onRemove: (id: string) => void
  isRemoving: boolean
}

function LyricsCard({ item, onRemove, isRemoving }: LyricsCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft]       = useState(item.lyrics)
  const [confirmed, setConfirmed] = useState(false)
  const queryClient = useQueryClient()

  const updateLyrics = useMutation({
    mutationFn: (lyrics: string) =>
      api.patch(`/saved-lyrics/${item.id}`, { lyrics }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 2000)
    },
  })

  const isDirty  = draft !== item.lyrics
  const imgUrl   = item.searchHistory?.imgUrl
  const searchUrl = item.searchHistory?.url

  return (
    <li className="rounded-xl bg-app-card border p-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={item.track}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 cursor-pointer"
            onClick={() => searchUrl && window.open(searchUrl, '_blank', 'noopener,noreferrer')}
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-app-input flex-shrink-0 flex items-center justify-center text-app-faint text-base">
            ♪
          </div>
        )}

        <button className="flex-1 text-left min-w-0" onClick={() => setExpanded((v) => !v)}>
          <p className="font-medium text-app-ink text-sm truncate">{item.track}</p>
          <p className="text-xs text-app-muted truncate">{item.artist}</p>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Lyrics badge */}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            item.lyrics
              ? 'bg-spotify-green/15 text-spotify-green'
              : 'bg-app-input text-app-faint'
          }`}>
            {item.lyrics ? 'lyrics' : 'empty'}
          </span>

          {/* Expand */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-app-faint hover:text-app-ink transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"
              style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Remove */}
          <button
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            aria-label="Remove from favorites"
            className="text-app-faint text-lg leading-none disabled:opacity-30 hover:text-app-ink transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Lyrics editor */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t">
          <textarea
            className="w-full min-h-48 mt-2.5 bg-app-input border border-app-edge rounded-lg p-3 resize-y focus:outline-none focus:border-app-muted/60 transition-colors text-sm"
            placeholder="Paste or write lyrics here…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateLyrics.mutate(draft)}
              disabled={!isDirty || updateLyrics.isPending}
              className="px-4 py-2 rounded-lg bg-spotify-green text-black text-xs font-semibold disabled:opacity-40 hover:bg-spotify-green/90 transition-colors"
            >
              {updateLyrics.isPending ? 'Saving…' : 'Save lyrics'}
            </button>
            {confirmed && <span className="text-xs text-spotify-green">Saved!</span>}
            {isDirty && !updateLyrics.isPending && (
              <button
                onClick={() => setDraft(item.lyrics)}
                className="text-xs text-app-muted hover:text-app-ink transition-colors"
              >
                Discard
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export default function SavedLyrics() {
  const queryClient = useQueryClient()

  const { data: savedLyrics = [], isLoading } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/saved-lyrics/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] }),
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-app-input animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-app-card border border-app-edge animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-app-faint uppercase tracking-widest">
        Saved Songs
      </p>
      {savedLyrics.length === 0 ? (
        <p className="text-sm text-app-faint py-2">
          No saved songs yet — hit ♡ on a history item.
        </p>
      ) : (
        <ul className="space-y-1">
          {savedLyrics.map((item) => (
            <LyricsCard
              key={item.id}
              item={item}
              onRemove={(id) => remove.mutate(id)}
              isRemoving={remove.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
