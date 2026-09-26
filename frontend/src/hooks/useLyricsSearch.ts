import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { CURRENT_TRACK_KEY } from './useNowPlaying'
import { useSettingsStore, type SearchMode } from '../stores/settingsStore'
import type { SearchHistoryItem, SpotifyCurrentlyPlayingResponse } from '../types'

export type { SearchMode } from '../stores/settingsStore'

export function useLyricsSearch() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const mode = useSettingsStore((s) => s.search.mode)
  const update = useSettingsStore((s) => s.update)

  function toggleMode(next: SearchMode) {
    update('search', { mode: next })
  }

  const saveEntry = useMutation({
    mutationFn: (entry: Omit<SearchHistoryItem, 'id' | 'createdAt'>) =>
      api.post<SearchHistoryItem>('/search-history', entry).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-history'] }),
  })

  async function handleSearch() {
    setError(null)
    // Fresh from the store — another instance may have toggled it meanwhile.
    const currentMode = useSettingsStore.getState().search.mode
    try {
      // The layout polls this anyway — reuse a fresh cached answer if there is one.
      const current = await queryClient.fetchQuery({
        queryKey: CURRENT_TRACK_KEY,
        queryFn: () =>
          api
            .get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track')
            .then((r) => r.data),
        staleTime: 2_000,
      })
      const track = current?.item
      if (!track) {
        setError('Derzeit wird nichts abgespielt')
        return
      }
      const artistNames = track.artists.map((a) => a.name)
      const primaryArtist = artistNames[0] ?? ''
      const url = `https://www.google.com/search?q=${encodeURIComponent(`${primaryArtist} ${track.name} lyrics`)}`
      if (currentMode === 'open') window.open(url, '_blank', 'noopener,noreferrer')
      saveEntry.mutate({
        spotifyId: track.id,
        track: track.name,
        artist: primaryArtist,
        artists: artistNames,
        url,
        imgUrl: track.album.images[0]?.url,
      })
    } catch {
      setError('Aktueller Track kann nicht abgerufen werden. Ist Spotify verbunden?')
    }
  }

  return {
    handleSearch,
    isPending: saveEntry.isPending,
    error,
    clearError: () => setError(null),
    mode,
    toggleMode,
  }
}
