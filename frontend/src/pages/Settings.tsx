import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, LogOut, Moon, Sun } from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import UsernameEdit from '../components/UsernameEdit'
import { useTheme } from '../hooks/useTheme'

interface SpotifyStatus {
  connected: boolean
  spotifyId: string | null
}

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
    const navigate  = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { isDark, toggle } = useTheme()

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  const { data: status, isLoading } = useQuery<SpotifyStatus>({
    queryKey: ['spotify-status'],
    queryFn: () => api.get<SpotifyStatus>('/spotify/status').then((r) => r.data),
  })

  const disconnect = useMutation({
    mutationFn: () => api.delete('/spotify/disconnect'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spotify-status'] }),
  })

  useEffect(() => {
    const result = searchParams.get('spotify')
    if (!result) return
    if (result === 'connected') {
      queryClient.invalidateQueries({ queryKey: ['spotify-status'] })
    }
    setSearchParams((prev) => { prev.delete('spotify'); return prev })
  }, [searchParams, queryClient, setSearchParams])

  async function handleConnect() {
    const { data } = await api.get<{ url: string }>('/spotify/connect')
    window.location.href = data.url
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto space-y-8 overflow-hidden">
      <div>
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
          Account
        </p>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>

      {/* Account section */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-widest">
          Profile
        </p>
        <div className="rounded-xl bg-surface-raised border border-edge divide-y divide-edge">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs text-foreground-subtle mb-0.5">Email</p>
              <p className="text-sm text-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-foreground-subtle mb-1.5">Display name</p>
            <UsernameEdit />
          </div>
        </div>
      </section>

      {/* Spotify section */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-widest">
          Spotify
        </p>

        <div className="rounded-xl bg-surface-raised border border-edge overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-4 space-y-2">
              <div className="h-3 w-20 rounded-full bg-surface-overlay animate-pulse" />
              <div className="h-3 w-40 rounded-full bg-surface-overlay animate-pulse" />
            </div>
          ) : status?.connected ? (
            <div className="px-4 py-4 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <p className="text-sm font-medium text-foreground">Connected</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-foreground-muted truncate">
                    Spotify ID: {status.spotifyId}
                  </p>
                  {status.spotifyId && (
                    <a
                      href={`https://open.spotify.com/user/${status.spotifyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground-subtle hover:text-accent transition-colors flex-shrink-0"
                      aria-label="Open Spotify profile"
                    >
                      <ExternalLink size={11} strokeWidth={1.75} />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="text-xs text-foreground-subtle hover:text-foreground-muted disabled:opacity-40
                           transition-colors flex-shrink-0 pt-0.5"
              >
                {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <div className="px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground mb-0.5">Not connected</p>
                <p className="text-xs text-foreground-subtle">
                  Connect to search lyrics from your currently playing track.
                </p>
              </div>
              <button
                onClick={handleConnect}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                           hover:opacity-90 transition-opacity"
              >
                Connect
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="pt-6 border-t border-edge">
        <div className="flex items-center justify-between pt-0.5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              <LogOut size={12} strokeWidth={1.75} />
              Sign out
            </button>
            <button
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-overlay hover:text-foreground transition-colors"
            >
              {isDark ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
            </button>
          </div>
        </section>
    </div>
  )
}
