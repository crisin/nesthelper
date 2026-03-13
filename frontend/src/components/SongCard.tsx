import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import TrackCover from './TrackCover'

export interface SongCardProps {
  imgUrl?: string | null
  title: string
  artist: string
  /** Drives navigation on click. null/undefined = non-navigable card */
  spotifyId?: string | null

  /** 'list' = standard row (default). 'grid' = square cover with footer */
  variant?: 'list' | 'grid'
  /** Cover size — list variant only. 'sm' = w-9, 'md' = w-14 (default) */
  size?: 'sm' | 'md'

  /** Below the artist line (list) or below the title (grid) */
  meta?: ReactNode
  /** Right side (list) or footer row (grid) */
  actions?: ReactNode
  /** Overlaid on the cover art — grid variant only */
  coverActions?: ReactNode
  /** Below the main row, inside the card — for confirmations etc */
  append?: ReactNode

  /** Set true for Spotify play-history items not saved in DB — disables click/hover */
  noNavigate?: boolean

  className?: string
}

export default function SongCard({
  imgUrl, title, artist, spotifyId,
  variant = 'list', size = 'md',
  meta, actions, coverActions, append,
  noNavigate = false,
  className = '',
}: SongCardProps) {
  const navigate = useNavigate()
  const canNavigate = !!spotifyId && !noNavigate
  const handleClick = canNavigate ? () => navigate(`/songs/${spotifyId}`) : undefined

  if (variant === 'grid') {
    return (
      <div className={`group rounded-xl bg-surface-raised border border-edge overflow-hidden shadow-card ${className}`}>
        <div
          className={`relative aspect-square ${canNavigate ? 'cursor-pointer' : ''}`}
          onClick={handleClick}
        >
          <TrackCover src={imgUrl} track={title} artist={artist} className="w-full h-full rounded-none" iconSize={48} />
          {coverActions && <div className="absolute inset-0">{coverActions}</div>}
        </div>
        <div className="px-2.5 py-2.5 flex items-center gap-2">
          <div
            className={`flex-1 min-w-0 ${canNavigate ? 'cursor-pointer' : ''}`}
            onClick={handleClick}
          >
            <p className="text-sm font-semibold truncate leading-tight">{title}</p>
            <p className="text-xs text-foreground-muted truncate mt-0.5">{artist}</p>
            {meta}
          </div>
          {actions}
        </div>
      </div>
    )
  }

  // List variant
  const sm = size === 'sm'
  const textContent = (
    <>
      <p className={`text-foreground text-sm truncate ${sm ? 'font-medium' : 'font-semibold leading-tight'}`}>{title}</p>
      <p className={`text-xs text-foreground-muted truncate${sm ? '' : ' mt-0.5'}`}>{artist}</p>
      {meta}
    </>
  )

  const containerClass = [
    'bg-surface-raised border border-edge rounded-xl overflow-hidden shadow-card',
    canNavigate && 'hover:border-foreground-muted/40 transition-colors group',
    className,
  ].filter(Boolean).join(' ')

  if (canNavigate) {
    return (
      <button
        onClick={handleClick}
        className={`w-full text-left hover:bg-surface-overlay active:scale-[0.99] transition-all group ${containerClass}`}
      >
        <div className={`flex items-center ${sm ? 'gap-3 px-3 py-2.5' : 'gap-3.5 px-3 py-3'}`}>
          <TrackCover src={imgUrl} track={title} artist={artist} className={sm ? 'w-9 h-9 rounded-lg' : 'w-24 h-24 rounded-xl shadow-sm'} iconSize={sm ? 14 : 48} />
          <div className="flex-1 min-w-0">{textContent}</div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>{actions}</div>}
        </div>
        {append}
      </button>
    )
  }

  return (
    <div className={containerClass}>
      <div className={`flex items-center ${sm ? 'gap-3 px-3 py-2.5' : 'gap-3.5 px-3 py-3'}`}>
        <TrackCover src={imgUrl} track={title} artist={artist} className={sm ? 'w-9 h-9 rounded-lg' : 'w-24 h-24 rounded-xl shadow-sm'} iconSize={sm ? 14 : 48} />
        <div className="flex-1 min-w-0">{textContent}</div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {append}
    </div>
  )
}
