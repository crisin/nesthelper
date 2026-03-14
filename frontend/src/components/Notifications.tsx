import { useEffect, useState } from 'react'
import { X, Check, AlertCircle, Info } from 'lucide-react'
import { useNotificationStore } from '../stores/notificationStore'
import type { Notification } from '../stores/notificationStore'

// ─── Single notification item ─────────────────────────────────────────────────

const ICONS: Record<string, React.ReactNode> = {
  success: <Check size={14} strokeWidth={2.5} />,
  error:   <AlertCircle size={14} strokeWidth={2} />,
  info:    <Info size={14} strokeWidth={2} />,
}

const COLOR: Record<string, string> = {
  success: 'border-accent/30 bg-accent/10 text-accent',
  error:   'border-red-500/30 bg-red-500/10 text-red-400',
  info:    'border-edge bg-surface-raised text-foreground-muted',
}

function NotificationItem({ n }: { n: Notification }) {
  const dismiss = useNotificationStore((s) => s.dismiss)
  // Enter animation: items start invisible, become visible on next frame
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const visible = entered && !n.exiting

  return (
    <div
      className={[
        'flex items-start gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-xl',
        'transition-all duration-[220ms] ease-out',
        COLOR[n.type],
      ].join(' ')}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(14px)',
        minWidth: 220,
        maxWidth: 360,
      }}
      role="status"
      aria-live="polite"
    >
      <span className="flex-shrink-0 mt-0.5">{ICONS[n.type]}</span>
      <p className="flex-1 text-sm leading-snug">{n.message}</p>
      {n.dismissable && (
        <button
          onClick={() => dismiss(n.id)}
          aria-label="Schließen"
          className="flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity ml-1 mt-0.5"
        >
          <X size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

export default function Notifications() {
  const notifications = useNotificationStore((s) => s.notifications)
  if (notifications.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2 items-end pointer-events-none"
      aria-label="Benachrichtigungen"
    >
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <NotificationItem n={n} />
        </div>
      ))}
    </div>
  )
}
