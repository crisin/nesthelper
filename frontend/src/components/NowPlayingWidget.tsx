import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Music, Radio } from 'lucide-react'
import api from '../services/api'
import type { SpotifyCurrentlyPlayingResponse } from '../types'
import LyricsViewer from './LyricsViewer'

export default function NowPlayingWidget() {
  const [viewerOpen, setViewerOpen] = useState(false)

  const { data: track } = useQuery<SpotifyCurrentlyPlayingResponse | null>({
    queryKey: ['spotify-current-track'],
    queryFn: () =>
      api.get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track').then((r) => r.data),
    refetchInterval: 5_000,
    staleTime: 0,
    retry: false,
  })

  if (!track?.item) return null

  const { item, progress_ms, is_playing } = track
  const progressPct = item.duration_ms > 0 ? ((progress_ms ?? 0) / item.duration_ms) * 100 : 0
  const imgUrl = item.album.images[0]?.url

  return (
    <>
      <button
        onClick={() => setViewerOpen(true)}
        className="w-full rounded-xl border border-edge bg-surface overflow-hidden text-left hover:border-foreground-muted/40 transition-colors"
      >
        {/* Full-width cover */}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={item.name}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div className="w-full aspect-square bg-surface-overlay flex items-center justify-center">
            <Music size={28} className="text-foreground-subtle" strokeWidth={1.25} />
          </div>
        )}

        {/* Track info + progress */}
        <div className="px-3 pt-2.5 pb-2 space-y-2">
          <div className="flex items-start gap-1.5">
            {is_playing && (
              <Radio
                size={9}
                className="text-accent flex-shrink-0 mt-1 animate-pulse"
                strokeWidth={2}
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight truncate">
                {item.name}
              </p>
              <p className="text-[10px] text-foreground-muted truncate mt-0.5">
                {item.artists.map((a) => a.name).join(', ')}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 rounded-full bg-surface-overlay overflow-hidden">
            <div
              className="h-full bg-accent/60 rounded-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </button>

      {viewerOpen && (
        <LyricsViewer
          track={item.name}
          artist={item.artists[0]?.name ?? ''}
          artists={item.artists.map((a) => a.name)}
          imgUrl={imgUrl}
          lyrics=""
          spotifyId={item.id}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
