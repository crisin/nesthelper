import { useCallback } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

/** Light/dark, per user. SettingsSync applies the class to <html>. */
export function useTheme() {
  const theme = useSettingsStore((s) => s.theme.mode)
  const update = useSettingsStore((s) => s.update)

  const toggle = useCallback(() => {
    update('theme', { mode: theme === 'dark' ? 'light' : 'dark' })
  }, [theme, update])

  return { theme, isDark: theme === 'dark', toggle }
}
