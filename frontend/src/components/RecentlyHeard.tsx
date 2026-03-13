import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookmarkPlus, Check, RefreshCw } from 'lucide-react'
import api from '../services/api'
import type { PlayHistoryEntry } from '../types'
import SongCard from './SongCard'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std.`
  return `vor ${Math.floor(h / 24)} Tagen`
}

function PlayRow({ entry }: { entry: PlayHistoryEntry }) {
  const queryClient = useQueryClient()
  const [done, setDone] = useState(false)

  const importMutation = useMutation({
    mutationFn: () =>
      api.post<{ imported: boolean }>(`/spotify/plays/${entry.spotifyId}/import`).then((r) => r.data),
    onSuccess: (data) => {
      setDone(true)
      if (data.imported) {
        queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      }
    },
  })

  return (
    <SongCard
      imgUrl={entry.imgUrl}
      title={entry.track}
      artist={entry.artists.join(', ') || entry.artist}
      size="sm"
      noNavigate
      actions={
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-foreground-subtle hidden sm:block">
            {timeAgo(entry.playedAt)}
          </span>
          <button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || done}
            title={done ? 'Gespeichert' : 'Als Song speichern'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-subtle
                       hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-40"
          >
            {done
              ? <Check size={13} strokeWidth={2} className="text-accent" />
              : <BookmarkPlus size={13} strokeWidth={1.75} />
            }
          </button>
        </div>
      }
    />
  )
}

export default function RecentlyHeard() {
  const queryClient = useQueryClient()

  const { data: plays = [], isLoading } = useQuery<PlayHistoryEntry[]>({
    queryKey: ['play-history'],
    queryFn: () => api.get<PlayHistoryEntry[]>('/spotify/plays?limit=20').then((r) => r.data),
    staleTime: 30_000,
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post<{ synced: number }>('/spotify/sync-history').then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['play-history'] }),
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-9 h-9 rounded-lg bg-surface-raised animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded-full bg-surface-raised animate-pulse" />
              <div className="h-2.5 w-20 rounded-full bg-surface-raised animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (plays.length === 0) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-subtle">Noch keine gehörten Songs aufgezeichnet.</p>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-accent
                     transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} strokeWidth={1.75} className={syncMutation.isPending ? 'animate-spin' : ''} />
          Von Spotify importieren
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
          Zuletzt gehört
        </p>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          title="Spotify-Verlauf synchronisieren"
          className="w-6 h-6 flex items-center justify-center rounded-md text-foreground-subtle
                     hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} strokeWidth={1.75} className={syncMutation.isPending ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="divide-y divide-edge/50">
        {plays.map((entry) => (
          <PlayRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
