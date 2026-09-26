import { useEffect, useReducer, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '../services/api'
import type { SpotifyCurrentlyPlayingResponse } from '../types'
import { SPOTIFY_STATUS_KEY, useSpotifyStatus } from './useSpotifyStatus'
import { useSettingsStore } from '../stores/settingsStore'

export const CURRENT_TRACK_KEY = ['spotify-current-track']

// ─── Request log (for the poll tick display) ─────────────────────────────────

export interface PollEntry {
  /** When the response (or error) arrived. */
  at: number
  /** Round trip in ms. */
  ms: number
  /** HTTP status, or 0 when the server wasn't reached. */
  status: number
}

const LOG_WINDOW_MS = 60_000
let pollLog: PollEntry[] = []
const logListeners = new Set<() => void>()

function recordPoll(entry: PollEntry) {
  const cutoff = entry.at - LOG_WINDOW_MS
  // New array each time so useSyncExternalStore sees the change.
  pollLog = [...pollLog.filter((e) => e.at >= cutoff), entry]
  logListeners.forEach((l) => l())
}

/** Every current-track request of the last minute, oldest first. */
export function usePollLog(): PollEntry[] {
  return useSyncExternalStore(
    (listener) => {
      logListeners.add(listener)
      return () => logListeners.delete(listener)
    },
    () => pollLog,
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface Options {
  /**
   * Use the fast interval from the polling settings (karaoke, sync mode,
   * timestamp editing) instead of the playing/idle pair.
   */
  fast?: boolean
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
export function useNowPlaying({ fast = false, poll = true }: Options = {}) {
  const queryClient = useQueryClient()
  const polling = useSettingsStore((s) => s.polling)
  const intervalMs = fast ? polling.fastMs : polling.playingMs
  const idleIntervalMs = fast ? polling.fastMs : polling.idleMs
  // Without a connection every poll is a guaranteed 404 — don't ask at all.
  const { data: status } = useSpotifyStatus()
  const connected = !!status?.connected

  return useQuery<SpotifyCurrentlyPlayingResponse | null>({
    queryKey: CURRENT_TRACK_KEY,
    queryFn: async () => {
      const started = performance.now()
      const log = (status: number) =>
        recordPoll({ at: Date.now(), ms: Math.round(performance.now() - started), status })
      try {
        const r = await api.get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track')
        log(r.status)
        return r.data
      } catch (err) {
        log(isAxiosError(err) ? (err.response?.status ?? 0) : 0)
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
      ? (query) => {
          // Spotify rate-limited us: wait as long as it asked, then resume.
          const err = query.state.error
          if (isAxiosError(err) && err.response?.status === 429) {
            const retryAfter = Number(err.response.data?.retryAfter) || 30
            return retryAfter * 1000
          }
          return query.state.data?.is_playing ? intervalMs : idleIntervalMs
        }
      : false,
    staleTime: 0,
    retry: false,
  })
}

/**
 * Playback position right now: Spotify's `progress_ms` moved forward by the
 * time since that answer arrived. Lets the UI stay smooth (and sync taps stay
 * accurate) with a poll every few seconds instead of every few hundred ms.
 */
export function interpolateProgress(
  track: SpotifyCurrentlyPlayingResponse | null | undefined,
  receivedAt: number,
): number {
  const base = track?.progress_ms ?? 0
  if (!track?.is_playing || !receivedAt) return base
  const duration = track.item?.duration_ms ?? Infinity
  return Math.min(base + (Date.now() - receivedAt), duration)
}

/** `interpolateProgress` for the cached track, for event handlers. */
export function readProgressMs(queryClient: QueryClient): number {
  const state = queryClient.getQueryState<SpotifyCurrentlyPlayingResponse | null>(
    CURRENT_TRACK_KEY,
  )
  return interpolateProgress(state?.data, state?.dataUpdatedAt ?? 0)
}

/**
 * Re-renders every `tickMs` while the track is playing, so a component can
 * read `interpolateProgress` in render. Purely local — no network.
 */
export function useProgressTick(isPlaying: boolean, tickMs: number) {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(tick, tickMs)
    return () => clearInterval(id)
  }, [isPlaying, tickMs])
}
