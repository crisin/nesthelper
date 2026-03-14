import { create } from 'zustand'

export type NotificationType = 'success' | 'error' | 'info'

export interface Notification {
  id: string
  message: string
  type: NotificationType
  dismissable: boolean
  lifetime: number    // ms; 0 = never auto-dismiss
  exiting: boolean    // true while the exit animation is playing
}

type AddOptions = {
  message: string
  type: NotificationType
  dismissable?: boolean
  lifetime?: number
}

interface NotificationStore {
  notifications: Notification[]
  add(opts: AddOptions): string
  dismiss(id: string): void
}

let _seq = 0
const EXIT_MS = 220  // must match transition duration in Notifications.tsx

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  add({ message, type, dismissable = true, lifetime = 4000 }) {
    const id = `notif-${++_seq}`
    set((s) => ({
      notifications: [
        ...s.notifications,
        { id, message, type, dismissable, lifetime, exiting: false },
      ],
    }))
    if (lifetime > 0) {
      setTimeout(() => get().dismiss(id), lifetime)
    }
    return id
  },

  dismiss(id) {
    // Mark as exiting → triggers CSS exit animation
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, exiting: true } : n,
      ),
    }))
    // Remove after animation completes
    setTimeout(() => {
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      }))
    }, EXIT_MS)
  },
}))

// ─── Convenience hook ─────────────────────────────────────────────────────────

type NotifyOptions = { lifetime?: number; dismissable?: boolean }

export function useNotify() {
  const add = useNotificationStore((s) => s.add)
  return {
    success: (message: string, opts?: NotifyOptions) =>
      add({ message, type: 'success', dismissable: opts?.dismissable ?? true, lifetime: opts?.lifetime ?? 4000 }),
    error: (message: string, opts?: NotifyOptions) =>
      add({ message, type: 'error', dismissable: opts?.dismissable ?? true, lifetime: opts?.lifetime ?? 6000 }),
    info: (message: string, opts?: NotifyOptions) =>
      add({ message, type: 'info', dismissable: opts?.dismissable ?? true, lifetime: opts?.lifetime ?? 4000 }),
  }
}
