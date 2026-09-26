import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { SPOTIFY_STATUS_KEY, useSpotifyStatus } from '../hooks/useSpotifyStatus'

export default function SpotifyConnect() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const { data: status, isLoading } = useSpotifyStatus()

  const disconnect = useMutation({
    mutationFn: () => api.delete('/spotify/disconnect'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SPOTIFY_STATUS_KEY }),
  })

  useEffect(() => {
    const result = searchParams.get('spotify')
    if (!result) return
    if (result === 'connected') {
      queryClient.invalidateQueries({ queryKey: SPOTIFY_STATUS_KEY })
    }
    setSearchParams((prev) => { prev.delete('spotify'); return prev })
  }, [searchParams, queryClient, setSearchParams])

  async function handleConnect() {
    const { data } = await api.get<{ url: string }>('/spotify/connect')
    window.location.href = data.url
  }

  if (isLoading) {
    return <div className="h-5 w-28 rounded bg-surface-overlay animate-pulse" />
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Spotify
        </span>
        <button
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
          className="text-xs text-foreground-subtle hover:text-foreground-muted disabled:opacity-40 transition-colors"
        >
          Trennen
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      className="px-3 py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                 hover:opacity-90 transition-opacity w-full"
    >
      Spotify verbinden
    </button>
  )
}
