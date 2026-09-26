import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export interface SpotifyStatus {
  connected: boolean
  spotifyId: string | null
}

export const SPOTIFY_STATUS_KEY = ['spotify-status']

/**
 * Whether the user has Spotify connected. Shared by key across every consumer.
 *
 * Connecting and disconnecting invalidate this key explicitly, and a lost
 * session is reported by the now-playing poll, so there is no need to refetch
 * it on every mount or window focus.
 */
export function useSpotifyStatus() {
  return useQuery<SpotifyStatus>({
    queryKey: SPOTIFY_STATUS_KEY,
    queryFn: () => api.get<SpotifyStatus>('/spotify/status').then((r) => r.data),
    staleTime: 5 * 60_000,
  })
}
