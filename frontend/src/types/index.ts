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

export interface SongTag {
  id: string
  tag: string
  type: 'CONTEXT' | 'MOOD'
  createdAt: string
}

export interface LineAnnotation {
  id: string
  lineId: string
  userId: string
  text: string
  emoji?: string | null
  createdAt: string
  updatedAt: string
}

export interface LyricsLine {
  id: string
  lineNumber: number
  text: string
  timestampMs?: number | null
  annotations?: LineAnnotation[]
}

export interface LyricsVersion {
  id: string
  version: number
  rawText: string
  createdAt: string
}

export interface StructuredLyrics {
  id: string
  savedLyricId: string
  rawText: string
  version: number
  createdAt: string
  updatedAt: string
  lines: LyricsLine[]
  versions: LyricsVersion[]
}

export interface SavedLyric {
  id: string
  track: string
  artist: string
  lyrics: string
  note?: string | null
  searchHistoryId?: string
  searchHistory?: { imgUrl?: string; url?: string; spotifyId?: string } | null
  tags?: SongTag[]
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
  searchCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface CommunityLyric {
  id: string
  lyrics: string
  createdAt: string
  user: { name: string | null }
}
