import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { SearchHistoryItem, SpotifyCurrentlyPlayingResponse } from '../types'

export type SearchMode = 'open' | 'save'

export function useLyricsSearch() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<SearchMode>(
    () => (localStorage.getItem('searchMode') as SearchMode) ?? 'open',
  )

  function toggleMode(next: SearchMode) {
    setMode(next)
    localStorage.setItem('searchMode', next)
  }

  const saveEntry = useMutation({
    mutationFn: (entry: Omit<SearchHistoryItem, 'id' | 'createdAt'>) =>
      api.post<SearchHistoryItem>('/search-history', entry).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-history'] }),
  })

  async function handleSearch() {
    setError(null)
    // Read mode fresh from localStorage so all instances stay in sync
    const currentMode = (localStorage.getItem('searchMode') as SearchMode) ?? 'open'
    try {
      const res = await api.get<SpotifyCurrentlyPlayingResponse>('/spotify/current-track')
      const track = res.data?.item
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
