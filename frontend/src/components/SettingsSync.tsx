import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

/**
 * Loads the logged-in user's settings and applies the global ones (theme).
 * Switching accounts in the same browser swaps the settings with them.
 */
export default function SettingsSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const load = useSettingsStore((s) => s.load)
  const clear = useSettingsStore((s) => s.clear)
  const themeMode = useSettingsStore((s) => s.theme.mode)

  useEffect(() => {
    if (userId) void load(userId)
    else clear()
  }, [userId, load, clear])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark')
  }, [themeMode])

  return null
}
