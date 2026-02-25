import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import LyricsSearch from '../components/LyricsSearch'
import PullToRefresh from '../components/PullToRefresh'
import api from '../services/api'

interface SpotifyStatus {
  connected: boolean
  spotifyId: string | null
}

async function connectSpotify() {
  const { data } = await api.get<{ url: string }>('/spotify/connect')
  window.location.href = data.url
}

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: status, isLoading: statusLoading } = useQuery<SpotifyStatus>({
    queryKey: ['spotify-status'],
    queryFn: () => api.get<SpotifyStatus>('/spotify/status').then((r) => r.data),
  })

  const notConnected = !statusLoading && !status?.connected

  const handleRefresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['search-history'] }),
    [queryClient],
  )

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto space-y-5 overflow-hidden">
      {/* Spotify connect prompt */}
      {notConnected && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl
                        bg-surface-raised border border-edge">
          <div>
            <p className="text-sm font-medium text-foreground">Spotify ist nicht verbunden</p>
            <p className="text-xs text-foreground-muted mt-0.5">
              Verbinde dich um deine aktive Wiedergabe zu suchen.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={connectSpotify}
              className="px-3.5 py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                         hover:opacity-90 transition-opacity"
            >
              Verbinden
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="text-xs text-foreground-subtle hover:text-foreground-muted transition-colors"
            >
              Einstellungen
            </button>
          </div>
        </div>
      )}

      <div>
     
        {/* <h2 className="text-base font-semibold text-foreground">Search Lyrics</h2> */}
      </div>
      <LyricsSearch />
    </div>
    </PullToRefresh>
  )
}
