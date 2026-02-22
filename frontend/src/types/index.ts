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
