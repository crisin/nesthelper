import { useEffect, useRef, useCallback, useState, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

const DISMISS_THRESHOLD = 80

export default function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const handleClose = useCallback(() => {
    setDragOffset(0)
    setDragging(false)
    onClose()
  }, [onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    setDragging(true)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current
    // Only allow dragging down
    setDragOffset(Math.max(0, dy))
  }, [])

  const onTouchEnd = useCallback(() => {
    setDragging(false)
    if (dragOffset > DISMISS_THRESHOLD) {
      handleClose()
    } else {
      setDragOffset(0)
    }
  }, [dragOffset, handleClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={handleClose}
        aria-hidden
      />

      {/* Sheet — mobile: bottom sheet, desktop: centered dialog */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                   bg-surface-raised rounded-t-2xl sm:rounded-2xl border border-edge shadow-card
                   max-h-[80vh] sm:max-w-sm sm:w-full overflow-hidden"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-foreground-subtle/40" />
        </div>

        <div className="p-5 pb-safe">
          {children}
        </div>
      </div>
    </div>
  )
}
