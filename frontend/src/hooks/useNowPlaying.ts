import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '../services/api'
import type { SpotifyCurrentlyPlayingResponse } from '../types'
import { SPOTIFY_STATUS_KEY, useSpotifyStatus } from './useSpotifyStatus'

export const CURRENT_TRACK_KEY = ['spotify-current-track']

interface Options {
  /** How often this consumer needs fresh data. Ignored when `poll` is false. */
  intervalMs?: number
  /**
   * Interval while nothing is playing (paused or idle). Defaults to
   * `intervalMs`; the always-on layout poll sets it higher, since a paused
   * player doesn't need checking every few seconds.
   */
  idleIntervalMs?: number
  /**
   * Whether this consumer schedules its own refetch.
   *
   * React Query dedupes in-flight *requests* but not `refetchInterval` timers —
   * every observer schedules its own. AppLayout always polls at 5s, so anything
   * that only displays the track should pass `poll: false` and read from the
   * shared cache. Only components that genuinely need sub-second updates
   * (karaoke, timestamping) should turn their own timer on.
   */
  poll?: boolean
}

/** The currently playing track, shared by key across every consumer. */
export function useNowPlaying({
  intervalMs = 5_000,
  idleIntervalMs = intervalMs,
  poll = true,
}: Options = {}) {
  const queryClient = useQueryClient()
  // Without a connection every poll is a guaranteed 404 — don't ask at all.
  const { data: status } = useSpotifyStatus()
  const connected = !!status?.connected

  return useQuery<SpotifyCurrentlyPlayingResponse | null>({
    queryKey: CURRENT_TRACK_KEY,
    queryFn: async () => {
      try {
        const r = await api.get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track')
        return r.data
      } catch (err) {
        // 404 = not connected, 403 = session revoked: the cached status is
        // stale, so refresh it and the poll switches itself off.
        const code = isAxiosError(err) ? err.response?.status : undefined
        if (code === 403 || code === 404) {
          queryClient.invalidateQueries({ queryKey: SPOTIFY_STATUS_KEY })
        }
        throw err
      }
    },
    enabled: connected,
    refetchInterval: poll
      ? (query) => (query.state.data?.is_playing ? intervalMs : idleIntervalMs)
      : false,
    staleTime: 0,
    retry: false,
  })
}
