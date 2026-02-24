import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>
  children: ReactNode
}

const THRESHOLD = 64

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { containerRef, pullDistance, isRefreshing, isPulling } = usePullToRefresh(onRefresh)

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const showIndicator = pullDistance > 8 || isRefreshing

  return (
    <div ref={containerRef} className="relative sm:contents">
      {/* Pull indicator — mobile only */}
      {showIndicator && (
        <div
          className="sm:hidden flex items-center justify-center pointer-events-none"
          style={{
            height: pullDistance,
            transition: isPulling ? 'none' : 'height 0.25s ease-out',
          }}
        >
          <div
            className="text-foreground-muted"
            style={{
              opacity: progress,
              transform: `rotate(${isRefreshing ? 0 : progress * 270}deg)`,
            }}
          >
            <RefreshCw
              size={20}
              strokeWidth={2}
              className={isRefreshing ? 'animate-spin' : ''}
            />
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
