export interface User {
  id: string
  email: string
  name?: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface SearchHistoryItem {
  id: string
  spotifyId: string
  track: string
  artist: string
  url: string
  imgUrl?: string
  createdAt: string
}

export interface SavedLyric {
  id: string
  track: string
  artist: string
  lyrics: string
  searchHistoryId?: string
  searchHistory?: { imgUrl?: string; url?: string } | null
  createdAt: string
}

export interface LibraryTrack {
  id: string
  spotifyId: string
  name: string
  artist: string
  imgUrl?: string
  url: string
  lyricsCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface CommunityLyric {
  id: string
  lyrics: string
  createdAt: string
  user: { name: string | null }
}
