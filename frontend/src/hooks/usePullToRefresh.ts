import { useRef, useState, useCallback, useEffect } from 'react'

interface PullToRefreshState {
  pulling: boolean
  pullDistance: number
  refreshing: boolean
}

const THRESHOLD = 64
const MAX_PULL = 100
const RESISTANCE = 0.4

export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const pulling = useRef(false)

  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    pullDistance: 0,
    refreshing: false,
  })

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only activate when at scroll top
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    if (scrollTop > 0) return
    startY.current = e.touches[0].clientY
    pulling.current = false
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    if (scrollTop > 0) return

    const dy = e.touches[0].clientY - startY.current
    if (dy <= 0) {
      if (pulling.current) {
        pulling.current = false
        setState((s) => ({ ...s, pulling: false, pullDistance: 0 }))
      }
      return
    }

    pulling.current = true
    const distance = Math.min(dy * RESISTANCE, MAX_PULL)
    setState((s) => ({ ...s, pulling: true, pullDistance: distance }))
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    if (state.pullDistance >= THRESHOLD) {
      setState({ pulling: false, pullDistance: THRESHOLD, refreshing: true })
      try {
        await onRefresh()
      } finally {
        setState({ pulling: false, pullDistance: 0, refreshing: false })
      }
    } else {
      setState({ pulling: false, pullDistance: 0, refreshing: false })
    }
  }, [state.pullDistance, onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    containerRef,
    pullDistance: state.pullDistance,
    isRefreshing: state.refreshing,
    isPulling: state.pulling,
  }
}
