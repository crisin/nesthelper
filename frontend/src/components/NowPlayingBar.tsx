import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Maximize2, Music } from 'lucide-react'
import { useNowPlaying } from '../hooks/useNowPlaying'
import LyricsViewer from './LyricsViewer'

/**
 * Mobile now-playing bar, docked directly above the bottom nav.
 *
 * The phone had no now-playing surface at all before this — the widget and its
 * "Song ansehen" action live in the desktop-only sidebar. Tapping the bar goes
 * straight to the song's detail page; the fullscreen lyrics overlay moves to a
 * separate button so the common case stays one tap.
 */
export default function NowPlayingBar() {
  // AppLayout owns the 5s poll; this only displays what's already in the cache.
  const { data: track } = useNowPlaying({ poll: false })
  const [viewerOpen, setViewerOpen] = useState(false)

  const item = track?.item
  if (!item) return null

  const imgUrl = item.album.images[0]?.url
  const artists = item.artists.map((a) => a.name).join(', ')
  const progressPct =
    item.duration_ms > 0
      ? Math.min(((track.progress_ms ?? 0) / item.duration_ms) * 100, 100)
      : 0

  return (
    <>
      {/* Progress hairline — spans the full width, no numbers; this is a
          glanceable strip, not a player */}
      <div className="h-0.5 bg-surface-overlay">
        <div
          className="h-full bg-accent/70 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-stretch border-b border-edge">
        <Link
          to={`/songs/${item.id}`}
          aria-label={`${item.name} von ${artists} – Songdetails öffnen`}
          className="flex-1 min-w-0 min-h-[52px] flex items-center gap-2.5 px-3 py-2 text-left
                     active:bg-surface-overlay transition-colors"
        >
          {imgUrl ? (
            <img
              src={imgUrl}
              alt=""
              className="w-9 h-9 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded bg-surface-overlay flex items-center justify-center flex-shrink-0">
              <Music size={15} className="text-foreground-subtle" strokeWidth={1.5} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">
              {item.name}
            </p>
            <p className="text-[10px] text-foreground-muted truncate mt-0.5">
              {track.is_playing ? artists : `Pausiert · ${artists}`}
            </p>
          </div>

          <ChevronRight
            size={15}
            strokeWidth={1.75}
            className="text-foreground-subtle flex-shrink-0"
          />
        </Link>

        <button
          onClick={() => setViewerOpen(true)}
          aria-label="Lyrics im Vollbild"
          className="px-4 flex items-center border-l border-edge text-foreground-subtle
                     active:bg-surface-overlay transition-colors"
        >
          <Maximize2 size={16} strokeWidth={1.75} />
        </button>
      </div>

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
