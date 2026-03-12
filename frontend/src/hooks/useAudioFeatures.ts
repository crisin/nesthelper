import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export interface AudioFeatures {
  tempo: number
  energy: number
  valence: number
  danceability: number
}

export function useAudioFeatures(spotifyId: string | null | undefined) {
  return useQuery<AudioFeatures | null>({
    queryKey: ['audio-features', spotifyId],
    queryFn: () =>
      api.get<AudioFeatures>(`/spotify/audio-features/${spotifyId}`).then((r) => r.data),
    enabled: !!spotifyId,
    staleTime: Infinity, // audio features never change per track
    retry: false,
  })
}
