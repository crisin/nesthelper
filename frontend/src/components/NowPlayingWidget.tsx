import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Music, Radio } from 'lucide-react'
import api from '../services/api'
import type { SpotifyCurrentlyPlayingResponse } from '../types'
import LyricsViewer from './LyricsViewer'

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function NowPlayingWidget() {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [localProgressMs, setLocalProgressMs] = useState(0)
  const baseProgressMs = useRef(0)
  const fetchedAt = useRef(Date.now())

  const { data: track } = useQuery<SpotifyCurrentlyPlayingResponse | null>({
    queryKey: ['spotify-current-track'],
    queryFn: () =>
      api.get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track').then((r) => r.data),
    refetchInterval: 5_000,
    staleTime: 0,
    retry: false,
  })

  // Sync refs + local state whenever Spotify gives us a new position
  useEffect(() => {
    if (track?.progress_ms != null) {
      baseProgressMs.current = track.progress_ms
      fetchedAt.current = Date.now()
      setLocalProgressMs(track.progress_ms)
    }
  }, [track?.progress_ms, track?.is_playing])

  // Tick every second to interpolate between polls; poll corrects drift
  useEffect(() => {
    if (!track?.is_playing) return
    const id = setInterval(() => {
      setLocalProgressMs(baseProgressMs.current + (Date.now() - fetchedAt.current))
    }, 1_000)
    return () => clearInterval(id)
  }, [track?.is_playing, track?.progress_ms])

  if (!track?.item) return null

  const { item, is_playing } = track
  const duration = item.duration_ms
  const progressPct = duration > 0 ? Math.min((localProgressMs / duration) * 100, 100) : 0
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

          {/* Progress bar + time */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full bg-surface-overlay overflow-hidden">
              <div
                className="h-full bg-accent/60 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[9px] tabular-nums text-foreground-subtle flex-shrink-0">
              {formatMs(localProgressMs)}
            </span>
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
