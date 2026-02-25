import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Music, X } from 'lucide-react'
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

  const isDirty   = draft !== item.lyrics
  const imgUrl    = item.searchHistory?.imgUrl
  const searchUrl = item.searchHistory?.url

  return (
    <li className="rounded-xl bg-surface-raised border border-edge overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={item.track}
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => searchUrl && window.open(searchUrl, '_blank', 'noopener,noreferrer')}
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-surface-overlay flex-shrink-0 flex items-center justify-center">
            <Music size={14} className="text-foreground-subtle" strokeWidth={1.75} />
          </div>
        )}

        <button className="flex-1 text-left min-w-0" onClick={() => setExpanded((v) => !v)}>
          <p className="font-medium text-foreground text-sm truncate">{item.track}</p>
          <p className="text-xs text-foreground-muted truncate">{item.artist}</p>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Lyrics badge */}
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
            item.lyrics
              ? 'bg-accent/10 text-accent'
              : 'bg-surface-overlay text-foreground-subtle'
          }`}>
            {item.lyrics ? 'lyrics' : 'empty'}
          </span>

          {/* Expand */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-foreground-subtle hover:text-foreground transition-colors p-0.5"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown
              size={15}
              strokeWidth={1.75}
              style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
            />
          </button>

          {/* Remove */}
          <button
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            aria-label="Remove from favorites"
            className="text-foreground-subtle disabled:opacity-30 hover:text-foreground transition-colors p-0.5"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Lyrics editor */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-edge animate-slide-down">
          <textarea
            className="w-full min-h-48 mt-2.5 bg-surface-overlay border border-edge rounded-lg p-3 resize-y
                       focus:outline-none focus:border-foreground-muted/60 transition-colors text-sm"
            placeholder="Paste or write lyrics here…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateLyrics.mutate(draft)}
              disabled={!isDirty || updateLyrics.isPending}
              className="px-3.5 py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                         disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {updateLyrics.isPending ? 'Saving…' : 'Save lyrics'}
            </button>
            {confirmed && <span className="text-xs text-accent">Saved!</span>}
            {isDirty && !updateLyrics.isPending && (
              <button
                onClick={() => setDraft(item.lyrics)}
                className="text-xs text-foreground-muted hover:text-foreground transition-colors"
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
        <div className="h-3 w-28 rounded-full bg-surface-overlay animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-surface-raised border border-edge animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
        Gespeicherte Songs
      </p>
      {savedLyrics.length === 0 ? (
        <p className="text-sm text-foreground-subtle py-2">
          Noch keine gespeicherten Songs — klicke auf ♡ bei einem Song im Verlauf.
        </p>
      ) : (
        <ul className="space-y-1.5">
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
