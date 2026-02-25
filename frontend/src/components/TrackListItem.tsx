import type { ReactNode } from 'react'
import TrackCover from './TrackCover'

export interface TrackListItemProps {
  src?: string | null
  track: string
  artist: string
  /** 'sm' = w-9 cover, 'md' = w-14 cover. Default: 'md' */
  size?: 'sm' | 'md'
  /** Rendered below the artist line, inside the text area */
  meta?: ReactNode
  /** Rendered on the right side of the row */
  actions?: ReactNode
  /** Rendered below the main row, inside the same card container */
  append?: ReactNode
  /** Makes the text/info area a clickable button */
  onContentClick?: () => void
  /** Makes the entire card a button */
  onCardClick?: () => void
  /** Adds border-hover highlight + `group` class for hover-reveal children */
  interactive?: boolean
  className?: string
}

export default function TrackListItem({
  src,
  track,
  artist,
  size = 'md',
  meta,
  actions,
  append,
  onContentClick,
  onCardClick,
  interactive = false,
  className = '',
}: TrackListItemProps) {
  const sm = size === 'sm'

  const textContent = (
    <>
      <p className={`text-foreground text-sm truncate ${sm ? 'font-medium' : 'font-semibold leading-tight'}`}>
        {track}
      </p>
      <p className={`text-xs text-foreground-muted truncate${sm ? '' : ' mt-0.5'}`}>
        {artist}
      </p>
      {meta}
    </>
  )

  const row = (
    <div className={`flex items-center ${sm ? 'gap-3 px-3 py-2.5' : 'gap-3.5 px-3 py-3'}`}>
      <TrackCover
        src={src}
        track={track}
        artist={artist}
        className={sm ? 'w-9 h-9 rounded-lg' : 'w-24 h-24 rounded-xl shadow-sm'}
        iconSize={sm ? 14 : 48}
      />

      {onContentClick ? (
        <button className="flex-1 text-left min-w-0" onClick={onContentClick}>
          {textContent}
        </button>
      ) : (
        <div className="flex-1 min-w-0">{textContent}</div>
      )}

      {actions}
    </div>
  )

  const containerClass = [
    'bg-surface-raised border border-edge rounded-xl overflow-hidden shadow-card',
    interactive && 'hover:border-foreground-muted/40 transition-colors group',
    className,
  ].filter(Boolean).join(' ')

  if (onCardClick) {
    return (
      <button
        onClick={onCardClick}
        className={`w-full text-left hover:bg-surface-overlay active:scale-[0.99] transition-all group ${containerClass}`}
      >
        {row}
        {append}
      </button>
    )
  }

  return (
    <div className={containerClass}>
      {row}
      {append}
    </div>
  )
}
