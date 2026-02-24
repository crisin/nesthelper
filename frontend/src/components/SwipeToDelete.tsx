import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { useSwipeAction } from '../hooks/useSwipeAction'

interface SwipeToDeleteProps {
  onDelete: () => void
  children: ReactNode
  disabled?: boolean
}

export default function SwipeToDelete({ onDelete, children, disabled }: SwipeToDeleteProps) {
  const { ref, style, handlers, revealed, close, confirm } = useSwipeAction(onDelete)

  if (disabled) return <>{children}</>

  return (
    <div className="relative overflow-hidden rounded-xl max-w-full">
      {/* Delete action zone — revealed behind the item on swipe */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 sm:hidden">
        <button
          onClick={confirm}
          className="flex flex-col items-center gap-0.5 text-white"
          aria-label="Delete"
        >
          <Trash2 size={18} strokeWidth={2} />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
      </div>

      {/* Swipeable content */}
      <div
        ref={ref}
        style={style}
        {...handlers}
        className="relative z-10"
      >
        {children}
      </div>

      {/* Backdrop to close when revealed */}
      {revealed && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={close}
          aria-hidden
        />
      )}
    </div>
  )
}
