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

export type Visibility = 'PRIVATE' | 'FRIENDS' | 'PUBLIC'

export type LyricsFetchStatus = 'IDLE' | 'FETCHING' | 'DONE' | 'FAILED'

export interface SavedLyric {
  id: string
  track: string
  artist: string
  lyrics: string
  note?: string | null
  visibility?: Visibility
  fetchStatus?: LyricsFetchStatus
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

// ─── Phase 2: Collections ─────────────────────────────────────────────────────

export interface CollectionItem {
  id: string
  collectionId: string
  savedLyricId?: string | null
  lineId?: string | null
  position: number
  addedAt: string
  savedLyric?: (SavedLyric & {
    searchHistory?: { imgUrl?: string; url?: string; spotifyId?: string } | null
  }) | null
  line?: (LyricsLine & {
    lyrics?: { savedLyric: Pick<SavedLyric, 'id' | 'track' | 'artist'> } | null
  }) | null
}

export interface Collection {
  id: string
  userId: string
  name: string
  description?: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  _count?: { items: number }
  items?: CollectionItem[]
  user?: { name: string | null }
}

// ─── Phase 2: Community Insights ─────────────────────────────────────────────

export interface TrackInsights {
  saveCount: number
  contributorCount: number
  tagDistribution: { tag: string; count: number }[]
  mostAnnotatedLines: { text: string; lineNumber: number; count: number }[]
}
