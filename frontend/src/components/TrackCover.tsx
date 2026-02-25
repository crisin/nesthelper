import { Music } from 'lucide-react'
import { useCoverViewer } from '../contexts/CoverViewerContext'

interface TrackCoverProps {
  src?: string | null
  track?: string
  artist?: string
  /** Tailwind classes for sizing, rounding, shadow — applied to both img and placeholder */
  className?: string
  iconSize?: number
}

/**
 * Reusable album-art component.
 * Clicking the image opens the full-screen CoverViewer overlay.
 * Renders a Music-icon placeholder when no src is provided.
 */
export default function TrackCover({
  src,
  track,
  artist,
  className = '',
  iconSize = 20,
}: TrackCoverProps) {
  const openCover = useCoverViewer()

  if (!src) {
    return (
      <div
        className={`bg-surface-overlay flex-shrink-0 flex items-center justify-center ${className}`}
      >
        <Music size={iconSize} className="text-foreground-subtle" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={track ?? 'Cover'}
      className={`object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        openCover({ src, track, artist })
      }}
    />
  )
}
