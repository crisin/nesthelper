import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import type { SpotifyCurrentlyPlayingResponse } from '../types'

export const CURRENT_TRACK_KEY = ['spotify-current-track']

interface Options {
  /** How often this consumer needs fresh data. Ignored when `poll` is false. */
  intervalMs?: number
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
export function useNowPlaying({ intervalMs = 5_000, poll = true }: Options = {}) {
  return useQuery<SpotifyCurrentlyPlayingResponse | null>({
    queryKey: CURRENT_TRACK_KEY,
    queryFn: () =>
      api
        .get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track')
        .then((r) => r.data),
    refetchInterval: poll ? intervalMs : false,
    staleTime: 0,
    retry: false,
  })
}
