import { useRef, useCallback, useState } from 'react'

interface SwipeState {
  offsetX: number
  swiping: boolean
  revealed: boolean
}

const THRESHOLD = 80
const LOCK_ANGLE = 25 // degrees — below this it's a horizontal swipe

export function useSwipeAction(onAction: () => void) {
  const elRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const locked = useRef<'x' | 'y' | null>(null)

  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    swiping: false,
    revealed: false,
  })

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    locked.current = null
    setState((s) => ({ ...s, swiping: true }))
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const dx = touch.clientX - startX.current
    const dy = touch.clientY - startY.current

    // Determine axis lock on first significant move
    if (locked.current === null) {
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx < 5 && absDy < 5) return // dead zone
      const angle = Math.atan2(absDy, absDx) * (180 / Math.PI)
      locked.current = angle < LOCK_ANGLE ? 'x' : 'y'
    }

    if (locked.current === 'y') return // vertical scroll, don't interfere

    // Only allow swiping left (negative dx)
    const clampedX = Math.min(0, Math.max(dx, -THRESHOLD * 1.5))
    setState({ offsetX: clampedX, swiping: true, revealed: false })
  }, [])

  const onTouchEnd = useCallback(() => {
    setState((prev) => {
      if (prev.offsetX < -THRESHOLD) {
        // Revealed — snap to threshold position
        return { offsetX: -THRESHOLD, swiping: false, revealed: true }
      }
      // Snap back
      return { offsetX: 0, swiping: false, revealed: false }
    })
    locked.current = null
  }, [])

  const close = useCallback(() => {
    setState({ offsetX: 0, swiping: false, revealed: false })
  }, [])

  const confirm = useCallback(() => {
    onAction()
    setState({ offsetX: 0, swiping: false, revealed: false })
  }, [onAction])

  const style: React.CSSProperties = {
    transform: `translateX(${state.offsetX}px)`,
    transition: state.swiping ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  return {
    ref: elRef,
    style,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    revealed: state.revealed,
    close,
    confirm,
  }
}
